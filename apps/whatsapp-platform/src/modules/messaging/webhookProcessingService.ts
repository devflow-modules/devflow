/**
 * Orquestração do processamento do webhook: persistir inbound → legado ou IA assíncrona.
 */

import type { ResolvedTenant } from "@/modules/tenants/tenantService";
import { findOrCreateConversation } from "@/modules/conversations/conversationsRepository";
import { insertMessage } from "./messagesRepository";
import { insertWebhookLog } from "./webhookLogsRepository";
import { sendWebhookAutoReply } from "./sendMessageService";
import { getReplyForMessage } from "@/modules/ai/ruleBasedReplies";
import { generateAiReply } from "@/modules/ai/aiOrchestrator";
import { createLlmProvider, isLlmConfigured } from "@devflow/ai-core";
import {
  trackInboundMessageReceived,
  trackConversationStarted,
  trackAiResponseGeneratedLlm,
  trackAiFallbackUsed,
} from "@/modules/analytics";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import type { IncomingMessage } from "@devflow/whatsapp-core";

export interface ProcessInboundMessageInput {
  tenant: ResolvedTenant;
  message: IncomingMessage;
  isNewConversation: boolean;
}

export interface PreparedInbound {
  conversationId: string;
  textBody: string;
}

function getTextBody(msg: IncomingMessage): string | null {
  if (msg.type !== "text") return null;
  const text = (msg as { text?: { body?: string } }).text;
  return text?.body ?? null;
}

/** Persiste inbound (Supabase + tracking) e retorna ids para reply. */
export async function prepareInboundConversation(
  input: ProcessInboundMessageInput
): Promise<PreparedInbound | null> {
  const { tenant, message, isNewConversation } = input;
  const textBody = getTextBody(message);
  if (!textBody?.trim()) return null;

  trackInboundMessageReceived();
  if (isNewConversation) trackConversationStarted();

  let conversationId: string;
  if (hasSupabaseConfig()) {
    const conversation = await findOrCreateConversation(tenant.id, message.from);
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
  return { conversationId, textBody };
}

/** Resposta automática legada (regras / WHATSAPP_ENABLE_LLM global). */
export async function processLegacyInboundAutoReply(
  tenant: ResolvedTenant,
  message: IncomingMessage,
  conversationId: string,
  textBody: string
): Promise<void> {
  const from = message.from;

  const useLlm =
    typeof process !== "undefined" &&
    process.env.WHATSAPP_ENABLE_LLM === "true" &&
    isLlmConfigured();

  let reply: string;
  if (useLlm) {
    try {
      const llm = createLlmProvider();
      reply = await generateAiReply({ userMessage: textBody, llm });
      trackAiResponseGeneratedLlm();
    } catch {
      reply = getReplyForMessage(textBody);
      trackAiFallbackUsed();
    }
  } else {
    reply = getReplyForMessage(textBody);
  }

  console.log("[WHATSAPP][DEBUG] legacy reply prepared", { to: from, replyLen: reply?.length ?? 0 });

  try {
    await sendWebhookAutoReply({
      tenant,
      to: from,
      text: reply,
      conversationId,
    });
    console.log("[WHATSAPP][DEBUG] legacy reply sent successfully", { to: from });
  } catch (err) {
    console.error("[WHATSAPP][ERROR] Erro ao enviar resposta legada:", err);
    const { trackMessageSendFailed } = await import("@/modules/analytics");
    trackMessageSendFailed();
  }
}

/** Fluxo completo legado (prepare + reply). Mantido para compatibilidade. */
export async function processInboundMessage(input: ProcessInboundMessageInput): Promise<void> {
  const prep = await prepareInboundConversation(input);
  if (!prep) return;
  await processLegacyInboundAutoReply(
    input.tenant,
    input.message,
    prep.conversationId,
    prep.textBody
  );
}

export async function persistWebhookLog(payload: unknown, tenantId: string | null): Promise<void> {
  if (!hasSupabaseConfig()) return;
  await insertWebhookLog(payload, tenantId);
}
