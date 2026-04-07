/**
 * Orquestração do processamento do webhook: preparar contexto para IA / resposta legada.
 * Inbound já foi persistido em wa_inbox_* por persistWaInboxFromWebhook (canónico).
 */

import type { ResolvedTenant } from "@/modules/tenants";
import { prisma } from "@/lib/prisma";
import { digitsOnly } from "@/modules/inbox/waInboxUtils";
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
import type { IncomingMessage } from "@devflow/whatsapp-core";

export interface ProcessInboundMessageInput {
  tenant: ResolvedTenant;
  message: IncomingMessage;
  isNewConversation: boolean;
}

export interface PreparedInbound {
  /** wa_inbox_threads.id */
  inboxThreadId: string;
  textBody: string;
}

function getTextBody(msg: IncomingMessage): string | null {
  if (msg.type !== "text") return null;
  const text = (msg as { text?: { body?: string } }).text;
  return text?.body ?? null;
}

/**
 * Resolve a thread Prisma já criada/atualizada pelo webhook inbox (mesma chave composta).
 */
export async function prepareInboundConversation(
  input: ProcessInboundMessageInput
): Promise<PreparedInbound | null> {
  const { tenant, message, isNewConversation } = input;
  const textBody = getTextBody(message);
  if (!textBody?.trim()) return null;

  trackInboundMessageReceived();
  if (isNewConversation) trackConversationStarted();

  const thread = await prisma.waInboxThread.findUnique({
    where: {
      tenantId_phoneNumber_businessPhoneNumberId: {
        tenantId: tenant.id,
        phoneNumber: digitsOnly(message.from),
        businessPhoneNumberId: tenant.phoneNumberId,
      },
    },
    select: { id: true },
  });

  if (!thread) {
    console.warn(
      "[WHATSAPP][WARN] prepareInboundConversation: thread wa_inbox inexistente após persist — verifique ordem webhook"
    );
    return null;
  }

  return { inboxThreadId: thread.id, textBody };
}

/** Resposta automática legada (regras / WHATSAPP_ENABLE_LLM global). */
export async function processLegacyInboundAutoReply(
  tenant: ResolvedTenant,
  message: IncomingMessage,
  inboxThreadId: string,
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
      inboxThreadId,
    });
    console.log("[WHATSAPP][DEBUG] legacy reply sent successfully", { to: from });
  } catch (err) {
    console.error("[WHATSAPP][ERROR] Erro ao enviar resposta legada:", err);
    const { trackMessageSendFailed } = await import("@/modules/analytics");
    trackMessageSendFailed();
  }
}

export async function processInboundMessage(input: ProcessInboundMessageInput): Promise<void> {
  const prep = await prepareInboundConversation(input);
  if (!prep) return;
  await processLegacyInboundAutoReply(input.tenant, input.message, prep.inboxThreadId, prep.textBody);
}
