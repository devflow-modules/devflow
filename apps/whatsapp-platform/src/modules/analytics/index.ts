/**
 * Módulo analytics — métricas de conversas, agentes e uso.
 * Usa @devflow/analytics-core.
 */
import { increment } from "@devflow/analytics-core";

export const ANALYTICS_MODULE = "analytics";

export const EVENTS = {
  tenantCreated: "whatsapp.tenant_created",
  conversationStarted: "whatsapp.conversation_started",
  conversationClosed: "whatsapp.conversation_closed",
  aiResponseGenerated: "whatsapp.ai_response_generated",
  messageSent: "whatsapp.message_sent",
  messageSendFailed: "whatsapp.message_send_failed",
  inboundMessageReceived: "whatsapp.inbound_message_received",
  webhookReceived: "whatsapp.webhook_received",
} as const;

export function trackTenantCreated(): void {
  increment(EVENTS.tenantCreated);
}
export function trackConversationStarted(): void {
  increment(EVENTS.conversationStarted);
}
export function trackConversationClosed(): void {
  increment(EVENTS.conversationClosed);
}
export function trackAiResponseGenerated(): void {
  increment(EVENTS.aiResponseGenerated);
}
export function trackMessageSent(): void {
  increment(EVENTS.messageSent);
}
export function trackMessageSendFailed(): void {
  increment(EVENTS.messageSendFailed);
}
export function trackInboundMessageReceived(): void {
  increment(EVENTS.inboundMessageReceived);
}
export function trackWebhookReceived(): void {
  increment(EVENTS.webhookReceived);
}
