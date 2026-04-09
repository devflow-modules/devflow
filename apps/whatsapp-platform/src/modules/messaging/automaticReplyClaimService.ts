/**
 * Claim atómico em DB para garantir no máximo um envio automático por
 * (tenant, thread, inboundWaMessageId, triggerSource).
 */

import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma-whatsapp";
import {
  Prisma,
  WaAutoReplyClaimStatus,
  WaAutoReplyClaimTrigger,
} from "@/generated/prisma-whatsapp";
import {
  assertAutomaticOutboundAllowed,
  type AutomaticOutboundTriggerContext,
  type AutomaticReplyAbortReason,
} from "./automaticReplyGuard";
import { getWaAutoReplyClaimTtlMs } from "./automaticReplyClaimConfig";
import {
  ctxTriggerToLogTrigger,
  recordWaAutoReplyClaimCompleteFailed,
  recordWaAutoReplyClaimCompleted,
  recordWaAutoReplyClaimCreated,
  recordWaAutoReplyClaimDuplicate,
  recordWaAutoReplyClaimExpired,
  recordWaAutoReplyClaimFailed,
  triggerEnumToLogTrigger,
} from "./automaticReplyClaimInstrumentation";

const MAX_CLAIM_ATTEMPTS = 4;

export function mapTriggerToPrismaEnum(
  source: AutomaticOutboundTriggerContext["triggerSource"]
): WaAutoReplyClaimTrigger {
  switch (source) {
    case "legacy":
      return WaAutoReplyClaimTrigger.LEGACY;
    case "ai":
      return WaAutoReplyClaimTrigger.AI;
    case "automation":
      return WaAutoReplyClaimTrigger.AUTOMATION;
    default:
      return WaAutoReplyClaimTrigger.LEGACY;
  }
}

export function isPrismaUniqueConstraintError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

function truncateFailure(s: string, max = 256): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export interface ClaimAutomaticReplyParams {
  tenantId: string;
  threadId: string;
  trigger: AutomaticOutboundTriggerContext;
  claimTtlMs?: number;
}

export type ClaimAutomaticReplyResult =
  | { ok: true; claimId: string; claimToken: string }
  | { ok: false; reason: AutomaticReplyAbortReason };

function logDuplicateClaim(params: {
  tenantId: string;
  threadId: string;
  trigger: AutomaticOutboundTriggerContext;
}): void {
  recordWaAutoReplyClaimDuplicate({
    tenantId: params.tenantId,
    threadId: params.threadId,
    triggerSource: ctxTriggerToLogTrigger(params.trigger.triggerSource),
  });
}

/**
 * Transação curta: valida gate + tenta inserir claim (ou recupera após FAILED / PENDING expirado).
 */
export async function claimAutomaticReplySend(
  prisma: PrismaClient,
  params: ClaimAutomaticReplyParams
): Promise<ClaimAutomaticReplyResult> {
  const ttl = params.claimTtlMs ?? getWaAutoReplyClaimTtlMs();
  const triggerEnum = mapTriggerToPrismaEnum(params.trigger.triggerSource);

  return prisma.$transaction(async (tx) => {
    const gate = await assertAutomaticOutboundAllowed(tx, {
      tenantId: params.tenantId,
      threadId: params.threadId,
      trigger: params.trigger,
    });
    if (!gate.allowed) {
      return { ok: false, reason: gate.reason };
    }

    const now = new Date();
    await tx.waAutoReplyClaim.deleteMany({
      where: {
        tenantId: params.tenantId,
        waInboxThreadId: params.threadId,
        inboundWaMessageId: params.trigger.inboundWaMessageId,
        triggerSource: triggerEnum,
        status: WaAutoReplyClaimStatus.PENDING,
        expiresAt: { lt: now },
      },
    });

    for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt++) {
      const claimToken = randomUUID();
      const expiresAt = new Date(Date.now() + ttl);
      try {
        const row = await tx.waAutoReplyClaim.create({
          data: {
            tenantId: params.tenantId,
            waInboxThreadId: params.threadId,
            inboundWaMessageId: params.trigger.inboundWaMessageId,
            triggerSource: triggerEnum,
            status: WaAutoReplyClaimStatus.PENDING,
            claimToken,
            expiresAt,
          },
        });
        recordWaAutoReplyClaimCreated({
          tenantId: params.tenantId,
          threadId: params.threadId,
          claimId: row.id,
          triggerSource: ctxTriggerToLogTrigger(params.trigger.triggerSource),
        });
        return { ok: true, claimId: row.id, claimToken: row.claimToken };
      } catch (e) {
        if (!isPrismaUniqueConstraintError(e)) throw e;

        const existing = await tx.waAutoReplyClaim.findUnique({
          where: {
            tenantId_waInboxThreadId_inboundWaMessageId_triggerSource: {
              tenantId: params.tenantId,
              waInboxThreadId: params.threadId,
              inboundWaMessageId: params.trigger.inboundWaMessageId,
              triggerSource: triggerEnum,
            },
          },
        });

        if (!existing) {
          logDuplicateClaim(params);
          return { ok: false, reason: "duplicate_claim" };
        }

        if (existing.status === WaAutoReplyClaimStatus.SENT) {
          logDuplicateClaim(params);
          return { ok: false, reason: "duplicate_claim" };
        }

        if (existing.status === WaAutoReplyClaimStatus.PENDING) {
          if (existing.expiresAt > now) {
            logDuplicateClaim(params);
            return { ok: false, reason: "duplicate_claim" };
          }
          await tx.waAutoReplyClaim.delete({ where: { id: existing.id } });
          continue;
        }

        if (
          existing.status === WaAutoReplyClaimStatus.FAILED ||
          existing.status === WaAutoReplyClaimStatus.EXPIRED
        ) {
          await tx.waAutoReplyClaim.delete({ where: { id: existing.id } });
          continue;
        }

        logDuplicateClaim(params);
        return { ok: false, reason: "duplicate_claim" };
      }
    }

    logDuplicateClaim(params);
    return { ok: false, reason: "duplicate_claim" };
  });
}

export interface VerifyClaimBeforeSendParams {
  claimId: string;
  claimToken: string;
  tenantId: string;
  threadId: string;
  trigger: AutomaticOutboundTriggerContext;
}

export type VerifyClaimBeforeSendResult =
  | { ok: true }
  | { ok: false; reason: AutomaticReplyAbortReason };

/**
 * Last mile após trabalho assíncrono (ex.: LLM): gate + claim ainda válido.
 */
export async function verifyAutomaticReplyClaimBeforeSend(
  prisma: PrismaClient,
  params: VerifyClaimBeforeSendParams
): Promise<VerifyClaimBeforeSendResult> {
  const gate = await assertAutomaticOutboundAllowed(prisma, {
    tenantId: params.tenantId,
    threadId: params.threadId,
    trigger: params.trigger,
  });
  if (!gate.allowed) {
    return { ok: false, reason: gate.reason };
  }

  const claim = await prisma.waAutoReplyClaim.findUnique({
    where: { id: params.claimId },
  });
  if (!claim) {
    return { ok: false, reason: "claim_not_owned" };
  }
  if (claim.claimToken !== params.claimToken) {
    return { ok: false, reason: "claim_not_owned" };
  }
  if (claim.status !== WaAutoReplyClaimStatus.PENDING) {
    return { ok: false, reason: "claim_not_owned" };
  }

  const now = new Date();
  if (claim.expiresAt <= now) {
    await prisma.waAutoReplyClaim.updateMany({
      where: {
        id: params.claimId,
        claimToken: params.claimToken,
        status: WaAutoReplyClaimStatus.PENDING,
      },
      data: {
        status: WaAutoReplyClaimStatus.EXPIRED,
        failureReason: "claim_expired",
      },
    });
    recordWaAutoReplyClaimExpired({
      tenantId: claim.tenantId,
      threadId: claim.waInboxThreadId,
      claimId: claim.id,
      triggerSource: triggerEnumToLogTrigger(claim.triggerSource),
    });
    return { ok: false, reason: "claim_expired" };
  }

  return { ok: true };
}

export async function completeAutomaticReplyClaim(
  prisma: PrismaClient,
  input: {
    claimId: string;
    claimToken: string;
    outboundWaMessageId: string;
  }
): Promise<{ ok: true } | { ok: false; reason: AutomaticReplyAbortReason }> {
  const res = await prisma.waAutoReplyClaim.updateMany({
    where: {
      id: input.claimId,
      claimToken: input.claimToken,
      status: WaAutoReplyClaimStatus.PENDING,
    },
    data: {
      status: WaAutoReplyClaimStatus.SENT,
      outboundWaMessageId: input.outboundWaMessageId,
      failureReason: null,
    },
  });
  if (res.count === 0) {
    const cur = await prisma.waAutoReplyClaim.findUnique({
      where: { id: input.claimId },
      select: {
        claimToken: true,
        status: true,
        expiresAt: true,
        tenantId: true,
        waInboxThreadId: true,
        triggerSource: true,
      },
    });
    if (!cur || cur.claimToken !== input.claimToken) {
      if (cur) {
        recordWaAutoReplyClaimCompleteFailed({
          tenantId: cur.tenantId,
          threadId: cur.waInboxThreadId,
          claimId: input.claimId,
          triggerSource: triggerEnumToLogTrigger(cur.triggerSource),
          reason: "claim_not_owned",
        });
      }
      return { ok: false, reason: "claim_not_owned" };
    }
    if (cur.expiresAt <= new Date()) {
      recordWaAutoReplyClaimCompleteFailed({
        tenantId: cur.tenantId,
        threadId: cur.waInboxThreadId,
        claimId: input.claimId,
        triggerSource: triggerEnumToLogTrigger(cur.triggerSource),
        reason: "claim_expired",
      });
      return { ok: false, reason: "claim_expired" };
    }
    recordWaAutoReplyClaimCompleteFailed({
      tenantId: cur.tenantId,
      threadId: cur.waInboxThreadId,
      claimId: input.claimId,
      triggerSource: triggerEnumToLogTrigger(cur.triggerSource),
      reason: "claim_not_owned",
    });
    return { ok: false, reason: "claim_not_owned" };
  }

  const row = await prisma.waAutoReplyClaim.findUnique({
    where: { id: input.claimId },
    select: {
      tenantId: true,
      waInboxThreadId: true,
      triggerSource: true,
      outboundWaMessageId: true,
    },
  });
  if (row?.outboundWaMessageId) {
    recordWaAutoReplyClaimCompleted({
      tenantId: row.tenantId,
      threadId: row.waInboxThreadId,
      claimId: input.claimId,
      triggerSource: triggerEnumToLogTrigger(row.triggerSource),
      outboundWaMessageId: row.outboundWaMessageId,
    });
  }
  return { ok: true };
}

export async function failAutomaticReplyClaim(
  prisma: PrismaClient,
  input: {
    claimId: string;
    claimToken: string;
    failureReason: string;
  }
): Promise<void> {
  const res = await prisma.waAutoReplyClaim.updateMany({
    where: {
      id: input.claimId,
      claimToken: input.claimToken,
      status: WaAutoReplyClaimStatus.PENDING,
    },
    data: {
      status: WaAutoReplyClaimStatus.FAILED,
      failureReason: truncateFailure(input.failureReason),
    },
  });
  if (res.count > 0) {
    const row = await prisma.waAutoReplyClaim.findUnique({
      where: { id: input.claimId },
      select: {
        tenantId: true,
        waInboxThreadId: true,
        triggerSource: true,
        failureReason: true,
      },
    });
    if (row) {
      recordWaAutoReplyClaimFailed({
        tenantId: row.tenantId,
        threadId: row.waInboxThreadId,
        claimId: input.claimId,
        triggerSource: triggerEnumToLogTrigger(row.triggerSource),
        failureReason: row.failureReason ?? input.failureReason,
      });
    }
  }
}
