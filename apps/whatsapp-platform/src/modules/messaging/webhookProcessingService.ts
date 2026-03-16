/**
 * Orquestração do processamento do webhook: normalizar → tenant → persistir → responder.
 */

import type { ResolvedTenant } from "@/modules/tenants/tenantService";
import { findOrCreateConversation, touchConversationLastMessage } from "@/modules/conversations/conversationsRepository";
import { insertMessage } from "./messagesRepository";
import { insertWebhookLog } from "./webhookLogsRepository";
import { sendReplyAndPersist } from "./sendMessageService";
import { getReplyForMessage } from "@/modules/ai/ruleBasedReplies";
import { trackInboundMessageReceived, trackConversationStarted } from "@/modules/analytics";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import type { IncomingMessage } from "@devflow/whatsapp-core";

export interface ProcessInboundMessageInput {
  tenant: ResolvedTenant;
  message: IncomingMessage;
  isNewConversation: boolean;
}

function getTextBody(msg: IncomingMessage): string | null {
  if (msg.type !== "text") return null;
  const text = (msg as { text?: { body?: string } }).text;
  return text?.body ?? null;
}

export async function processInboundMessage(input: ProcessInboundMessageInput): Promise<void> {
  const { tenant, message, isNewConversation } = input;
  const from = message.from;
  const textBody = getTextBody(message);
  if (!textBody) return;

  trackInboundMessageReceived();
  if (isNewConversation) trackConversationStarted();

  let conversationId: string;
  if (hasSupabaseConfig()) {
    const conversation = await findOrCreateConversation(tenant.id, from);
    conversationId = conversation.id;
    await insertMessage({
      conversation_id: conversationId,
      direction: "inbound",
      wa_message_id: message.id,
      body: textBody,
      status: null,
    });
  } else {
    conversationId = "no-db";
  }

  const reply = getReplyForMessage(textBody);
  try {
    if (hasSupabaseConfig() && conversationId !== "no-db") {
      await sendReplyAndPersist({
        tenant,
        to: from,
        text: reply,
        conversationId,
      });
      await touchConversationLastMessage(conversationId);
    } else {
      const { WhatsAppCloudAdapter } = await import("@devflow/whatsapp-core");
      const adapter = new WhatsAppCloudAdapter({ accessToken: tenant.accessToken });
      await adapter.sendText(tenant.phoneNumberId, { to: from, text: reply });
    }
  } catch (err) {
    console.error("[Webhook] Erro ao enviar resposta:", err);
    const { trackMessageSendFailed } = await import("@/modules/analytics");
    trackMessageSendFailed();
  }
}

export async function persistWebhookLog(payload: unknown, tenantId: string | null): Promise<void> {
  if (!hasSupabaseConfig()) return;
  await insertWebhookLog(payload, tenantId);
}
