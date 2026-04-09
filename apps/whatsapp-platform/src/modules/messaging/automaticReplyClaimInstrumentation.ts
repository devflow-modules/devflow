/**
 * Logs estruturados e contadores em memória para operações de wa_auto_reply_claims.
 * Nunca incluir claimToken em logs ou respostas públicas.
 */

import type { WaAutoReplyClaimTrigger } from "@/generated/prisma-whatsapp";
import { logEvent } from "@/lib/observability";

export type WaAutoReplyClaimLogTrigger =
  | "LEGACY"
  | "AI"
  | "AUTOMATION"
  | "unknown";

export function triggerEnumToLogTrigger(t: WaAutoReplyClaimTrigger): WaAutoReplyClaimLogTrigger {
  switch (t) {
    case "LEGACY":
      return "LEGACY";
    case "AI":
      return "AI";
    case "AUTOMATION":
      return "AUTOMATION";
    default:
      return "unknown";
  }
}

export function ctxTriggerToLogTrigger(
  source: "legacy" | "ai" | "automation"
): WaAutoReplyClaimLogTrigger {
  switch (source) {
    case "legacy":
      return "LEGACY";
    case "ai":
      return "AI";
    case "automation":
      return "AUTOMATION";
    default:
      return "unknown";
  }
}

const totals = new Map<string, number>();
/** Chaves dimensionais: `${event}:${tenantId}:${trigger}` — limitadas para não crescer sem controlo. */
const dimensional = new Map<string, number>();
const MAX_DIM_KEYS = 4_000;

function dimKey(
  event: string,
  tenantId: string,
  trigger: WaAutoReplyClaimLogTrigger
): string {
  return `${event}:${tenantId}:${trigger}`;
}

function bumpDim(event: string, tenantId: string, trigger: WaAutoReplyClaimLogTrigger): void {
  const k = dimKey(event, tenantId, trigger);
  dimensional.set(k, (dimensional.get(k) ?? 0) + 1);
  if (dimensional.size > MAX_DIM_KEYS) {
    const first = dimensional.keys().next().value;
    if (first !== undefined) dimensional.delete(first);
  }
}

function bumpTotal(event: string): void {
  totals.set(event, (totals.get(event) ?? 0) + 1);
}

export function recordWaAutoReplyClaimCreated(input: {
  tenantId: string;
  threadId: string;
  claimId: string;
  triggerSource: WaAutoReplyClaimLogTrigger;
}): void {
  bumpTotal("claim_created");
  bumpDim("claim_created", input.tenantId, input.triggerSource);
  logEvent("info", "inbox", "claim_created", {
    tenantId: input.tenantId,
    threadId: input.threadId,
    claimId: input.claimId,
    triggerSource: input.triggerSource,
  });
}

export function recordWaAutoReplyClaimDuplicate(input: {
  tenantId: string;
  threadId: string;
  triggerSource: WaAutoReplyClaimLogTrigger;
}): void {
  bumpTotal("claim_duplicate");
  bumpDim("claim_duplicate", input.tenantId, input.triggerSource);
  logEvent("info", "inbox", "claim_duplicate", {
    tenantId: input.tenantId,
    threadId: input.threadId,
    triggerSource: input.triggerSource,
  });
}

export function recordWaAutoReplyClaimCompleted(input: {
  tenantId: string;
  threadId: string;
  claimId: string;
  triggerSource: WaAutoReplyClaimLogTrigger;
  outboundWaMessageId: string;
}): void {
  bumpTotal("claim_completed");
  bumpDim("claim_completed", input.tenantId, input.triggerSource);
  logEvent("info", "inbox", "claim_completed", {
    tenantId: input.tenantId,
    threadId: input.threadId,
    claimId: input.claimId,
    triggerSource: input.triggerSource,
    outboundWaMessageId: input.outboundWaMessageId,
  });
}

export function recordWaAutoReplyClaimFailed(input: {
  tenantId: string;
  threadId: string;
  claimId: string;
  triggerSource: WaAutoReplyClaimLogTrigger;
  failureReason: string;
}): void {
  bumpTotal("claim_failed");
  bumpDim("claim_failed", input.tenantId, input.triggerSource);
  logEvent("info", "inbox", "claim_failed", {
    tenantId: input.tenantId,
    threadId: input.threadId,
    claimId: input.claimId,
    triggerSource: input.triggerSource,
    failureReason: input.failureReason.slice(0, 200),
  });
}

export function recordWaAutoReplyClaimExpired(input: {
  tenantId: string;
  threadId: string;
  claimId: string;
  triggerSource: WaAutoReplyClaimLogTrigger;
}): void {
  bumpTotal("claim_expired");
  bumpDim("claim_expired", input.tenantId, input.triggerSource);
  logEvent("info", "inbox", "claim_expired", {
    tenantId: input.tenantId,
    threadId: input.threadId,
    claimId: input.claimId,
    triggerSource: input.triggerSource,
  });
}

export function recordWaAutoReplyClaimCompleteFailed(input: {
  tenantId: string;
  threadId: string;
  claimId: string;
  triggerSource: WaAutoReplyClaimLogTrigger;
  reason: string;
}): void {
  bumpTotal("claim_complete_failed");
  bumpDim("claim_complete_failed", input.tenantId, input.triggerSource);
  logEvent("warn", "inbox", "claim_complete_failed", {
    tenantId: input.tenantId,
    threadId: input.threadId,
    claimId: input.claimId,
    triggerSource: input.triggerSource,
    reason: input.reason,
  });
}

export function getWaAutoReplyClaimMetricsSnapshot(): {
  totals: Record<string, number>;
  dimensional: Record<string, number>;
} {
  return {
    totals: Object.fromEntries(totals),
    dimensional: Object.fromEntries(dimensional),
  };
}

/** Vitest apenas. */
export function resetWaAutoReplyClaimMetricsForTests(): void {
  totals.clear();
  dimensional.clear();
}
