/**
 * Logs padronizados para webhook Stripe (produção).
 */

export function logWebhookEvent(
  eventType: string,
  eventId: string,
  tenantId?: string | null
): void {
  const tenant = tenantId ? ` tenant=${tenantId}` : "";
  console.log(`[STRIPE] event=${eventType} id=${eventId}${tenant}`);
}

export function logWebhookError(message: string, err?: unknown): void {
  console.error("[STRIPE][ERROR]", message, err ?? "");
}

export function logWebhookInvalidSignature(err: unknown): void {
  console.warn("[STRIPE][ERROR] Invalid signature", err);
}
