import type { ResolvedTenant } from "@/modules/tenants";
import { sendWebhookAutoReply } from "@/modules/messaging/sendMessageService";
import { logAiPipelineEvent } from "@/modules/ai/aiOperationalLogService";
import type { AiState } from "@/modules/ai/conversationStateService";

export type ExecuteAiActionsInput = {
  tenant: ResolvedTenant;
  tenantId: string;
  threadId: string;
  inboxThreadId: string;
  customerPhoneE164: string;
  inboundWaMessageId: string;
  replyText: string;
  aiStateSnapshot: AiState;
  decisionReason: string;
  modelUsed: string;
  providerKind: string | null;
  leadScoreSnapshot?: number | null;
};

/**
 * Envia resposta automática curta (regra) e regista evento operacional.
 */
export async function executeAiActions(input: ExecuteAiActionsInput): Promise<{ ok: boolean }> {
  const sendResult = await sendWebhookAutoReply({
    tenant: input.tenant,
    to: input.customerPhoneE164,
    inboxThreadId: input.inboxThreadId,
    text: input.replyText,
    outboundKind: "ai",
    automaticTrigger: { inboundWaMessageId: input.inboundWaMessageId, triggerSource: "ai" },
  });
  if (!sendResult.ok) return { ok: false };

  await logAiPipelineEvent({
    tenantId: input.tenantId,
    waInboxThreadId: input.threadId,
    inboundWaMessageId: input.inboundWaMessageId,
    outboundWaMessageId: sendResult.messageId,
    promptUsed: "(automation_rule)",
    responseGenerated: input.replyText,
    tokensUsed: null,
    durationMs: null,
    eventKind: "auto_reply",
    decisionReason: input.decisionReason,
    modelUsed: input.modelUsed,
    providerKind: input.providerKind,
    aiStateSnapshot: input.aiStateSnapshot,
    leadScoreSnapshot: input.leadScoreSnapshot ?? null,
  });
  return { ok: true };
}
