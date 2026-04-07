/**
 * Serviço de envio de mensagem — usa WhatsAppCloudAdapter e persiste outbound.
 */

import { WhatsAppCloudAdapter } from "@devflow/whatsapp-core";
import type { ResolvedTenant } from "@/modules/tenants/tenantService";
import { waInboxCreateOutbound } from "@/modules/inbox";
import { digitsOnly } from "@/modules/inbox/waInboxUtils";
import { insertMessage } from "./messagesRepository";
import { trackMessageSent } from "@/modules/analytics";
import { hasSupabaseConfig } from "@/lib/supabase-server";
import { touchConversationLastMessage } from "@/modules/conversations/conversationsRepository";
import { trackUsage } from "@/modules/billing/usageService";
import { UsageEventType } from "@/generated/prisma-whatsapp";

export interface SendReplyInput {
  tenant: ResolvedTenant;
  to: string;
  text: string;
  conversationId: string;
  /** Mensagens da equipa na Inbox vs resposta automática (IA). */
  outboundKind?: "agent" | "ai";
}

export async function sendReplyAndPersist(input: SendReplyInput): Promise<{ messageId: string }> {
  const adapter = new WhatsAppCloudAdapter({ accessToken: input.tenant.accessToken });
  const { messageId } = await adapter.sendText(input.tenant.phoneNumberId, {
    to: input.to,
    text: input.text,
  });
  console.info(`[WHATSAPP] outbound tenant=${input.tenant.id} wa_id=${input.to}`);
  await insertMessage({
    conversation_id: input.conversationId,
    direction: "outbound",
    wa_message_id: messageId,
    body: input.text,
    status: "sent",
  });
  await waInboxCreateOutbound({
    tenantId: input.tenant.id,
    customerPhoneDigits: digitsOnly(input.to),
    waMessageId: messageId,
    text: input.text,
    businessDigits: digitsOnly(input.tenant.displayPhoneNumber || ""),
    outboundKind: input.outboundKind ?? "agent",
  }).catch((e) => console.error("[WHATSAPP][ERROR] wa-inbox outbound:", e));
  trackMessageSent();
  trackUsage(input.tenant.id, UsageEventType.MESSAGE_SENT, {
    metadata: { source: "sendReplyAndPersist", conversationId: input.conversationId },
  });
  return { messageId };
}

/** Resposta automática pós-inbound (webhook / IA): Supabase + wa-inbox ou só wa-inbox. */
export async function sendWebhookAutoReply(input: SendReplyInput): Promise<{ messageId: string }> {
  console.log("[WHATSAPP][DEBUG] sendWebhookAutoReply", {
    tenantId: input.tenant.id,
    phoneNumberId: input.tenant.phoneNumberId,
    to: input.to,
    hasSupabase: hasSupabaseConfig(),
    conversationId: input.conversationId,
  });
  if (hasSupabaseConfig() && input.conversationId !== "no-db") {
    const r = await sendReplyAndPersist({ ...input, outboundKind: "ai" });
    await touchConversationLastMessage(input.conversationId);
    return r;
  }
  const adapter = new WhatsAppCloudAdapter({ accessToken: input.tenant.accessToken });
  const { messageId } = await adapter.sendText(input.tenant.phoneNumberId, {
    to: input.to,
    text: input.text,
  });
  console.info(`[WHATSAPP] outbound tenant=${input.tenant.id} wa_id=${input.to}`);
  await waInboxCreateOutbound({
    tenantId: input.tenant.id,
    customerPhoneDigits: digitsOnly(input.to),
    waMessageId: messageId,
    text: input.text,
    businessDigits: digitsOnly(input.tenant.displayPhoneNumber || ""),
    outboundKind: "ai",
  }).catch((e) => console.error("[WHATSAPP][ERROR] wa-inbox outbound:", e));
  trackMessageSent();
  trackUsage(input.tenant.id, UsageEventType.MESSAGE_SENT, {
    metadata: { source: "sendWebhookAutoReply" },
  });
  return { messageId };
}
