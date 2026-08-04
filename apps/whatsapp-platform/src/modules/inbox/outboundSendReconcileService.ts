/**
 * Reconciliação segura do ledger wa_inbox_send_requests.
 *
 * Princípio: resultado desconhecido nunca autoriza reenvio à Meta.
 * - SENDING recente: intocado
 * - SENDING antigo + waMessageId (evidência): META_ACCEPTED (sem Meta)
 * - SENDING antigo sem evidência: UNKNOWN_OUTCOME (fail-closed)
 * - META_ACCEPTED: tenta completar persistência local sem Meta
 *
 * Risco documentado: `updatedAt` é proxy do instante do claim SENDING
 * (não há coluna claimedAt dedicada). Timeout só dispara investigação, não prova falha pré-Meta.
 *
 * Acknowledge: marca revisão humana em lastError (prefixo RESOLVED|) mantendo
 * status UNKNOWN_OUTCOME — a tentativa original permanece inelegível a claim/retry Meta.
 */
import { prisma } from "@/lib/prisma";
import { digitsOnly } from "@/modules/inbox/waInboxUtils";
import { waInboxCreateOutbound } from "@/modules/inbox/waInboxMessageService";
import { logAction } from "@/modules/inbox/auditService";
import {
  markSendCompleted,
  markSendPersistFailed,
} from "@/modules/inbox/outboundSendRequestService";
import { logEvent, logError } from "@/lib/observability";

/** Tempo mínimo em SENDING antes de investigar (não prova falha na Meta). */
export const SENDING_STALE_AFTER_MS = 5 * 60 * 1000;

export const RECONCILE_BATCH_MAX = 50;

export const UNKNOWN_OUTCOME_MARKER = "UNKNOWN_OUTCOME:no_conclusive_meta_evidence";

export const ACK_RESOLVED_PREFIX = "RESOLVED|";

export type SendReconcileCounts = {
  scanned: number;
  sendingLeftRecent: number;
  markedUnknown: number;
  promotedMetaAccepted: number;
  completedFromMetaAccepted: number;
  skipped: number;
  errors: number;
};

export type SendReconcileOptions = {
  /** Escopo tenant; omitir = todos (só cron com segredo). */
  tenantId?: string;
  dryRun?: boolean;
  limit?: number;
  /** Override do limiar de staleness (testes). */
  staleAfterMs?: number;
  /** Relógio injectável (testes). */
  now?: Date;
};

function emptyCounts(): SendReconcileCounts {
  return {
    scanned: 0,
    sendingLeftRecent: 0,
    markedUnknown: 0,
    promotedMetaAccepted: 0,
    completedFromMetaAccepted: 0,
    skipped: 0,
    errors: 0,
  };
}

/**
 * CAS: SENDING → UNKNOWN_OUTCOME somente se ainda SENDING e stale.
 * Retorna true se esta invocação ganhou a transição.
 */
export async function claimSendingToUnknownOutcome(params: {
  id: string;
  tenantId: string;
  staleBefore: Date;
  dryRun?: boolean;
}): Promise<boolean> {
  if (params.dryRun) {
    const row = await prisma.waInboxSendRequest.findFirst({
      where: {
        id: params.id,
        tenantId: params.tenantId,
        status: "SENDING",
        waMessageId: null,
        updatedAt: { lt: params.staleBefore },
      },
      select: { id: true },
    });
    return Boolean(row);
  }
  const updated = await prisma.waInboxSendRequest.updateMany({
    where: {
      id: params.id,
      tenantId: params.tenantId,
      status: "SENDING",
      waMessageId: null,
      updatedAt: { lt: params.staleBefore },
    },
    data: {
      status: "UNKNOWN_OUTCOME",
      lastError: UNKNOWN_OUTCOME_MARKER,
    },
  });
  return updated.count === 1;
}

/**
 * CAS: SENDING com waMessageId → META_ACCEPTED (evidência persistida sem chamar Meta).
 */
export async function claimSendingWithEvidenceToMetaAccepted(params: {
  id: string;
  tenantId: string;
  waMessageId: string;
  staleBefore: Date;
  dryRun?: boolean;
}): Promise<boolean> {
  if (params.dryRun) {
    const row = await prisma.waInboxSendRequest.findFirst({
      where: {
        id: params.id,
        tenantId: params.tenantId,
        status: "SENDING",
        waMessageId: params.waMessageId,
        updatedAt: { lt: params.staleBefore },
      },
      select: { id: true },
    });
    return Boolean(row);
  }
  const updated = await prisma.waInboxSendRequest.updateMany({
    where: {
      id: params.id,
      tenantId: params.tenantId,
      status: "SENDING",
      waMessageId: params.waMessageId,
      updatedAt: { lt: params.staleBefore },
    },
    data: {
      status: "META_ACCEPTED",
      lastError: null,
    },
  });
  return updated.count === 1;
}

export async function acknowledgeUnknownOutcome(params: {
  tenantId: string;
  id: string;
  actorUserId: string;
  note?: string;
}): Promise<{ ok: true; alreadyAcknowledged?: boolean } | { ok: false; code: "NOT_FOUND" | "NOT_UNKNOWN" }> {
  const row = await prisma.waInboxSendRequest.findFirst({
    where: { id: params.id, tenantId: params.tenantId },
  });
  if (!row) return { ok: false, code: "NOT_FOUND" };
  if (row.status !== "UNKNOWN_OUTCOME") return { ok: false, code: "NOT_UNKNOWN" };

  // Idempotente: status permanece UNKNOWN_OUTCOME — nunca volta a PENDING/FAILED_PRE_META/SENDING.
  if (typeof row.lastError === "string" && row.lastError.startsWith(ACK_RESOLVED_PREFIX)) {
    return { ok: true, alreadyAcknowledged: true };
  }

  const note = (params.note ?? "acknowledged").trim().slice(0, 200);
  const lastError = `${ACK_RESOLVED_PREFIX}${params.actorUserId}|${note}`.slice(0, 2000);

  const updated = await prisma.waInboxSendRequest.updateMany({
    where: {
      id: row.id,
      tenantId: params.tenantId,
      status: "UNKNOWN_OUTCOME",
    },
    data: { lastError },
  });
  if (updated.count !== 1) {
    // Corrida: outro acknowledge já gravou — ainda UNKNOWN_OUTCOME.
    return { ok: true, alreadyAcknowledged: true };
  }

  await logAction(params.tenantId, row.threadId, params.actorUserId, "status_change", {
    reconcile: "acknowledge_unknown_outcome",
    ledgerId: row.id,
  });

  logEvent("info", "inbox", "send_ledger_unknown_acknowledged", {
    tenantId: params.tenantId,
    threadId: row.threadId,
    userId: params.actorUserId,
    ledgerId: row.id,
  });

  return { ok: true };
}

async function tryCompleteMetaAccepted(params: {
  id: string;
  tenantId: string;
  dryRun?: boolean;
}): Promise<"completed" | "skipped" | "error"> {
  const row = await prisma.waInboxSendRequest.findFirst({
    where: { id: params.id, tenantId: params.tenantId, status: "META_ACCEPTED" },
  });
  if (!row?.waMessageId) return "skipped";
  if (params.dryRun) return "completed";

  const thread = await prisma.waInboxThread.findFirst({
    where: { id: row.threadId, tenantId: params.tenantId },
  });
  if (!thread) return "skipped";

  const line = await prisma.whatsappPhoneNumber.findFirst({
    where: {
      tenantId: params.tenantId,
      phoneNumberId: thread.businessPhoneNumberId,
    },
    select: { displayPhoneNumber: true, phoneNumberId: true },
  });
  if (!line) return "skipped";

  try {
    await waInboxCreateOutbound({
      tenantId: params.tenantId,
      businessPhoneNumberId: line.phoneNumberId,
      customerPhoneDigits: thread.phoneNumber.replace(/\D/g, ""),
      waMessageId: row.waMessageId,
      text: row.text,
      businessDigits: digitsOnly(line.displayPhoneNumber ?? ""),
    });
    await markSendCompleted(row.id, row.waMessageId);
    return "completed";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markSendPersistFailed(row.id, msg);
    logError("inbox", e, {
      route: "inbox_send_reconcile",
      phase: "complete_meta_accepted",
      ledgerId: row.id,
    });
    return "error";
  }
}

/**
 * Lote idempotente: nunca chama a Meta.
 */
export async function runOutboundSendReconcileJob(
  options: SendReconcileOptions = {}
): Promise<SendReconcileCounts> {
  const counts = emptyCounts();
  const now = options.now ?? new Date();
  const staleAfterMs = options.staleAfterMs ?? SENDING_STALE_AFTER_MS;
  const staleBefore = new Date(now.getTime() - staleAfterMs);
  const limit = Math.min(
    RECONCILE_BATCH_MAX,
    Math.max(1, options.limit ?? RECONCILE_BATCH_MAX)
  );
  const dryRun = Boolean(options.dryRun);
  const tenantFilter = options.tenantId?.trim()
    ? { tenantId: options.tenantId.trim() }
    : {};

  const sendingCandidates = await prisma.waInboxSendRequest.findMany({
    where: {
      ...tenantFilter,
      status: "SENDING",
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: {
      id: true,
      tenantId: true,
      threadId: true,
      waMessageId: true,
      updatedAt: true,
      clientRequestId: true,
    },
  });

  for (const row of sendingCandidates) {
    counts.scanned += 1;
    if (row.updatedAt >= staleBefore) {
      counts.sendingLeftRecent += 1;
      continue;
    }

    try {
      if (row.waMessageId) {
        const won = await claimSendingWithEvidenceToMetaAccepted({
          id: row.id,
          tenantId: row.tenantId,
          waMessageId: row.waMessageId,
          staleBefore,
          dryRun,
        });
        if (won) {
          counts.promotedMetaAccepted += 1;
          if (!dryRun) {
            const done = await tryCompleteMetaAccepted({
              id: row.id,
              tenantId: row.tenantId,
              dryRun,
            });
            if (done === "completed") counts.completedFromMetaAccepted += 1;
            else if (done === "error") counts.errors += 1;
            else counts.skipped += 1;
          }
          logEvent("info", "inbox", "send_ledger_sending_promoted", {
            tenantId: row.tenantId,
            threadId: row.threadId,
            ledgerId: row.id,
            dryRun,
          });
        } else {
          counts.skipped += 1;
        }
        continue;
      }

      const won = await claimSendingToUnknownOutcome({
        id: row.id,
        tenantId: row.tenantId,
        staleBefore,
        dryRun,
      });
      if (won) {
        counts.markedUnknown += 1;
        logEvent("warn", "inbox", "send_ledger_marked_unknown", {
          tenantId: row.tenantId,
          threadId: row.threadId,
          ledgerId: row.id,
          dryRun,
        });
      } else {
        counts.skipped += 1;
      }
    } catch (e) {
      counts.errors += 1;
      logError("inbox", e, {
        route: "inbox_send_reconcile",
        phase: "sending_row",
        ledgerId: row.id,
      });
    }
  }

  const remaining = Math.max(0, limit - counts.scanned);
  if (remaining > 0) {
    const metaAccepted = await prisma.waInboxSendRequest.findMany({
      where: {
        ...tenantFilter,
        status: "META_ACCEPTED",
        waMessageId: { not: null },
      },
      orderBy: { updatedAt: "asc" },
      take: remaining,
      select: { id: true, tenantId: true },
    });

    for (const row of metaAccepted) {
      counts.scanned += 1;
      try {
        const done = await tryCompleteMetaAccepted({
          id: row.id,
          tenantId: row.tenantId,
          dryRun,
        });
        if (done === "completed") counts.completedFromMetaAccepted += 1;
        else if (done === "error") counts.errors += 1;
        else counts.skipped += 1;
      } catch (e) {
        counts.errors += 1;
        logError("inbox", e, {
          route: "inbox_send_reconcile",
          phase: "meta_accepted_row",
          ledgerId: row.id,
        });
      }
    }
  }

  return counts;
}

export async function listSendLedgerForAdmin(params: {
  tenantId: string;
  status?: "SENDING" | "UNKNOWN_OUTCOME" | "META_ACCEPTED" | "COMPLETED" | "FAILED_PRE_META" | "PENDING";
  skip?: number;
  take?: number;
}) {
  const take = Math.min(100, Math.max(1, params.take ?? 50));
  const skip = Math.max(0, params.skip ?? 0);
  const where = {
    tenantId: params.tenantId,
    ...(params.status ? { status: params.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.waInboxSendRequest.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        threadId: true,
        userId: true,
        clientRequestId: true,
        status: true,
        waMessageId: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
        // text omitido de propósito (PII / conteúdo)
      },
    }),
    prisma.waInboxSendRequest.count({ where }),
  ]);

  return {
    items: items.map((r) => ({
      ...r,
      acknowledged:
        r.status === "UNKNOWN_OUTCOME" &&
        typeof r.lastError === "string" &&
        r.lastError.startsWith(ACK_RESOLVED_PREFIX),
    })),
    total,
    skip,
    take,
  };
}
