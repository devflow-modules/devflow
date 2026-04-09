/**
 * Reconciliação operacional de wa_auto_reply_claims (expiração em batch, listagem stale, repair opcional).
 */

import type { PrismaClient } from "@/generated/prisma-whatsapp";
import { WaAutoReplyClaimStatus, WaInboxDirection } from "@/generated/prisma-whatsapp";
import { logEvent } from "@/lib/observability";
import { parseOutboundKindFromContentJson } from "./automaticReplyGuard";
import { recordWaAutoReplyClaimCompleted, triggerEnumToLogTrigger } from "./automaticReplyClaimInstrumentation";

export const WA_AUTO_REPLY_CLAIM_PUBLIC_SELECT = {
  id: true,
  tenantId: true,
  waInboxThreadId: true,
  inboundWaMessageId: true,
  triggerSource: true,
  status: true,
  expiresAt: true,
  outboundWaMessageId: true,
  failureReason: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface ReconcileExpiredPendingResult {
  expiredCount: number;
}

/**
 * Marca PENDING com expiresAt &lt; now como EXPIRED (batch). Idempotente para já EXPIRED/SENT.
 */
export async function expirePendingClaimsPastTtl(
  prisma: PrismaClient,
  now: Date = new Date()
): Promise<ReconcileExpiredPendingResult> {
  const result = await prisma.waAutoReplyClaim.updateMany({
    where: {
      status: WaAutoReplyClaimStatus.PENDING,
      expiresAt: { lt: now },
    },
    data: {
      status: WaAutoReplyClaimStatus.EXPIRED,
      failureReason: "claim_expired",
    },
  });
  logEvent("info", "ops", "wa_auto_reply_claims_reconciliation_batch_expired", {
    count: result.count,
  });
  return { expiredCount: result.count };
}

export interface ListStaleClaimsParams {
  tenantId: string;
  statuses: WaAutoReplyClaimStatus[];
  olderThan?: Date;
  limit: number;
}

/** Claims em estados terminais ou PENDING antigos (diagnóstico interno). */
export async function listStaleClaimsForTenant(
  prisma: PrismaClient,
  params: ListStaleClaimsParams
) {
  const { tenantId, statuses, olderThan, limit } = params;
  return prisma.waAutoReplyClaim.findMany({
    where: {
      tenantId,
      status: { in: statuses },
      ...(olderThan ? { createdAt: { lt: olderThan } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: WA_AUTO_REPLY_CLAIM_PUBLIC_SELECT,
  });
}

export type WaAutoReplyClaimPublicRow = Awaited<
  ReturnType<typeof listStaleClaimsForTenant>
>[number];

/**
 * Repair: se o claim está PENDING ou EXPIRED sem outbound, mas existe exactamente uma mensagem
 * outbound ai/automation na janela do turno, atualiza para SENT.
 */
export async function attemptRepairClaimFromOutboundEvidence(
  prisma: PrismaClient,
  claimId: string
): Promise<
  | { ok: true; repaired: true; outboundWaMessageId: string }
  | { ok: true; repaired: false; reason: string }
  | { ok: false; reason: string }
> {
  const claim = await prisma.waAutoReplyClaim.findUnique({
    where: { id: claimId },
  });
  if (!claim) {
    return { ok: false, reason: "not_found" };
  }
  if (claim.status === WaAutoReplyClaimStatus.SENT && claim.outboundWaMessageId) {
    return { ok: true, repaired: false, reason: "already_sent" };
  }
  if (
    claim.status !== WaAutoReplyClaimStatus.PENDING &&
    claim.status !== WaAutoReplyClaimStatus.EXPIRED
  ) {
    return { ok: true, repaired: false, reason: "status_not_repairable" };
  }

  const inbound = await prisma.waInboxMessage.findFirst({
    where: {
      tenantId: claim.tenantId,
      threadId: claim.waInboxThreadId,
      waMessageId: claim.inboundWaMessageId,
      direction: WaInboxDirection.INBOUND,
    },
    select: { ts: true },
  });
  if (!inbound) {
    return { ok: true, repaired: false, reason: "inbound_message_missing" };
  }

  const nextInbound = await prisma.waInboxMessage.findFirst({
    where: {
      tenantId: claim.tenantId,
      threadId: claim.waInboxThreadId,
      direction: WaInboxDirection.INBOUND,
      ts: { gt: inbound.ts },
    },
    orderBy: { ts: "asc" },
    select: { ts: true },
  });

  const outbounds = await prisma.waInboxMessage.findMany({
    where: {
      tenantId: claim.tenantId,
      threadId: claim.waInboxThreadId,
      direction: WaInboxDirection.OUTBOUND,
      ts: {
        gt: inbound.ts,
        ...(nextInbound ? { lt: nextInbound.ts } : {}),
      },
    },
    orderBy: { ts: "asc" },
    select: { waMessageId: true, contentJson: true },
  });

  const autoOutbounds = outbounds.filter((m) => {
    const k = parseOutboundKindFromContentJson(m.contentJson);
    return k === "ai" || k === "automation";
  });

  if (autoOutbounds.length === 0) {
    return { ok: true, repaired: false, reason: "no_automatic_outbound_in_window" };
  }
  if (autoOutbounds.length > 1) {
    return { ok: true, repaired: false, reason: "ambiguous_multiple_auto_outbounds" };
  }

  const outboundWaMessageId = autoOutbounds[0].waMessageId;

  await prisma.waAutoReplyClaim.update({
    where: { id: claimId },
    data: {
      status: WaAutoReplyClaimStatus.SENT,
      outboundWaMessageId,
      failureReason: null,
    },
  });

  recordWaAutoReplyClaimCompleted({
    tenantId: claim.tenantId,
    threadId: claim.waInboxThreadId,
    claimId: claim.id,
    triggerSource: triggerEnumToLogTrigger(claim.triggerSource),
    outboundWaMessageId,
  });

  logEvent("info", "ops", "wa_auto_reply_claim_repaired", {
    claimId,
    tenantId: claim.tenantId,
    outboundWaMessageId,
  });

  return { ok: true, repaired: true, outboundWaMessageId };
}

export async function runAutoReplyClaimReconciliationJob(
  prisma: PrismaClient,
  options: {
    repairLimit?: number;
  } = {}
): Promise<ReconcileExpiredPendingResult & { repairedIds: string[] }> {
  const expired = await expirePendingClaimsPastTtl(prisma);
  const repairedIds: string[] = [];
  const limit = options.repairLimit ?? 0;
  if (limit > 0) {
    const candidates = await prisma.waAutoReplyClaim.findMany({
      where: {
        status: WaAutoReplyClaimStatus.EXPIRED,
        outboundWaMessageId: null,
      },
      orderBy: { updatedAt: "asc" },
      take: limit,
      select: { id: true },
    });
    for (const c of candidates) {
      const r = await attemptRepairClaimFromOutboundEvidence(prisma, c.id);
      if (r.ok && "repaired" in r && r.repaired) {
        repairedIds.push(c.id);
      }
    }
  }
  return { ...expired, repairedIds };
}
