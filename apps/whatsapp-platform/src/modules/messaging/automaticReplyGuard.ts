/**
 * Regras de negócio — concorrência humano vs automação (IA / legado / regras):
 *
 * - Se a conversa está sob atendimento humano (thread atribuída a agente), automações não devem responder.
 * - Apenas threads OPEN e sem atribuição recebem resposta automática outbound.
 * - Antes de enviar qualquer resposta automática, o sistema revalida o estado atual da thread e o histórico
 *   desde a mensagem inbound que disparou o fluxo (janela até a próxima inbound do cliente).
 * - O envio efetivo exige claim atómico em `wa_auto_reply_claims` (ver automaticReplyClaimService).
 */

import type { Prisma } from "@/generated/prisma-whatsapp";
import {
  WaInboxDirection,
  WaInboxThreadStatus,
} from "@/generated/prisma-whatsapp";
import { logEvent } from "@/lib/observability";

/** Razões padronizadas para logs, aborts e testes (sem dados sensíveis). */
export type AutomaticReplyAbortReason =
  | "thread_missing"
  | "thread_not_open"
  | "thread_assigned_to_human"
  | "manual_reply_detected"
  | "duplicate_automation_blocked"
  | "duplicate_ai_log_detected"
  | "duplicate_claim"
  | "claim_not_owned"
  | "claim_expired";

export type AutomaticOutboundTriggerSource = "legacy" | "ai" | "automation";

export interface AutomaticOutboundTriggerContext {
  inboundWaMessageId: string;
  triggerSource: AutomaticOutboundTriggerSource;
}

export type AutomaticOutboundDb = Pick<
  Prisma.TransactionClient,
  "waInboxThread" | "waInboxMessage" | "aiMessageLog"
>;

export function parseOutboundKindFromContentJson(
  contentJson: unknown
): "agent" | "ai" | "automation" {
  if (contentJson && typeof contentJson === "object" && !Array.isArray(contentJson)) {
    const k = (contentJson as { outboundKind?: string }).outboundKind;
    if (k === "ai" || k === "automation" || k === "agent") return k;
  }
  return "agent";
}

export interface ThreadForAutomaticReplyGuard {
  status: WaInboxThreadStatus;
  assignedToUserId: string | null;
}

/**
 * Avaliação síncrona a partir de um snapshot da thread (útil em testes e camadas sem DB).
 */
export function getAutomaticReplyAbortReasonFromThread(
  thread: ThreadForAutomaticReplyGuard | null
): AutomaticReplyAbortReason | null {
  if (!thread) return "thread_missing";
  if (thread.status !== WaInboxThreadStatus.OPEN) return "thread_not_open";
  if (thread.assignedToUserId) return "thread_assigned_to_human";
  return null;
}

export function isThreadHandledByHuman(thread: ThreadForAutomaticReplyGuard | null): boolean {
  return getAutomaticReplyAbortReasonFromThread(thread) === "thread_assigned_to_human";
}

export interface EvaluateOutboundWindowInput {
  tenantId: string;
  threadId: string;
  inboundWaMessageId: string;
  triggerSource: AutomaticOutboundTriggerSource;
}

/**
 * Mensagens outbound na janela (após esta inbound, antes da próxima inbound do cliente).
 * Primeiro outbound agent → humano respondeu naquele turno; ai/automation → já houve auto-resposta.
 */
export async function evaluateOutboundWindowForInbound(
  db: AutomaticOutboundDb,
  input: EvaluateOutboundWindowInput
): Promise<AutomaticReplyAbortReason | null> {
  const inbound = await db.waInboxMessage.findFirst({
    where: {
      tenantId: input.tenantId,
      threadId: input.threadId,
      waMessageId: input.inboundWaMessageId,
      direction: WaInboxDirection.INBOUND,
    },
    select: { ts: true },
  });
  if (!inbound) return null;

  const nextInbound = await db.waInboxMessage.findFirst({
    where: {
      tenantId: input.tenantId,
      threadId: input.threadId,
      direction: WaInboxDirection.INBOUND,
      ts: { gt: inbound.ts },
    },
    orderBy: { ts: "asc" },
    select: { ts: true },
  });

  const outbounds = await db.waInboxMessage.findMany({
    where: {
      tenantId: input.tenantId,
      threadId: input.threadId,
      direction: WaInboxDirection.OUTBOUND,
      ts: {
        gt: inbound.ts,
        ...(nextInbound ? { lt: nextInbound.ts } : {}),
      },
    },
    orderBy: { ts: "asc" },
    select: { contentJson: true },
  });

  for (const row of outbounds) {
    const kind = parseOutboundKindFromContentJson(row.contentJson);
    if (kind === "agent") return "manual_reply_detected";
    if (kind === "ai" || kind === "automation") return "duplicate_automation_blocked";
  }

  if (input.triggerSource === "ai") {
    const logged = await db.aiMessageLog.findFirst({
      where: {
        tenantId: input.tenantId,
        inboundWaMessageId: input.inboundWaMessageId,
        outboundWaMessageId: { not: null },
      },
      select: { id: true },
    });
    if (logged) return "duplicate_ai_log_detected";
  }

  return null;
}

export interface AutomaticOutboundGateParams {
  tenantId: string;
  threadId: string;
  trigger?: AutomaticOutboundTriggerContext;
}

export type AutomaticOutboundGateResult =
  | { allowed: true }
  | { allowed: false; reason: AutomaticReplyAbortReason };

/**
 * Rechecagem imediata antes do envio automático (last mile): thread no DB + janela por inbound.
 */
export async function assertAutomaticOutboundAllowed(
  db: AutomaticOutboundDb,
  params: AutomaticOutboundGateParams
): Promise<AutomaticOutboundGateResult> {
  const thread = await db.waInboxThread.findFirst({
    where: { id: params.threadId, tenantId: params.tenantId },
    select: { status: true, assignedToUserId: true },
  });

  const threadReason = getAutomaticReplyAbortReasonFromThread(thread);
  if (threadReason) {
    return { allowed: false, reason: threadReason };
  }

  const trigger = params.trigger;
  if (!trigger?.inboundWaMessageId) {
    return { allowed: true };
  }

  const windowReason = await evaluateOutboundWindowForInbound(db, {
    tenantId: params.tenantId,
    threadId: params.threadId,
    inboundWaMessageId: trigger.inboundWaMessageId,
    triggerSource: trigger.triggerSource,
  });
  if (windowReason) {
    return { allowed: false, reason: windowReason };
  }

  return { allowed: true };
}

export function logAutomaticReplyAborted(input: {
  tenantId: string;
  threadId: string;
  reason: AutomaticReplyAbortReason;
  triggerSource: AutomaticOutboundTriggerSource | "unknown";
}): void {
  logEvent("info", "inbox", "automatic_reply_aborted", {
    tenantId: input.tenantId,
    threadId: input.threadId,
    reason: input.reason,
    triggerSource: input.triggerSource,
  });
}
