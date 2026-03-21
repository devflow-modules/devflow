/**
 * Stubs de tracking para eventos (mensagens, webhook, IA).
 * Ponto de extensão para integração futura (PostHog, Mixpanel, etc.).
 */

/** Registra envio de mensagem. Fire-and-forget. */
export function trackMessageSent(): void {
  // No-op. Uso real já é contabilizado via trackUsage(UsageEventType.MESSAGE_SENT).
}

/** Registra recebimento de webhook WhatsApp. Fire-and-forget. */
export function trackWebhookReceived(): void {
  // No-op. Reservado para métricas de throughput.
}

/** Registra mensagem inbound recebida. */
export function trackInboundMessageReceived(): void {
  // No-op.
}

/** Registra início de nova conversa. */
export function trackConversationStarted(): void {
  // No-op.
}

/** Registra resposta IA gerada por LLM. */
export function trackAiResponseGeneratedLlm(): void {
  // No-op.
}

/** Registra fallback usado (regras em vez de LLM). */
export function trackAiFallbackUsed(): void {
  // No-op.
}

/** Registra falha no envio de mensagem. */
export function trackMessageSendFailed(): void {
  // No-op.
}
