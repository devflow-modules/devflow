/**
 * Logs de diagnóstico desligados por defeito em produção.
 * Ver `.env.example`: WHATSAPP_WEBHOOK_VERBOSE, BILLING_INTERNAL_LOG.
 */

export function isWhatsappWebhookVerbose(): boolean {
  return process.env.WHATSAPP_WEBHOOK_VERBOSE === "1";
}

export function logWhatsappWebhookDebug(...args: Parameters<typeof console.log>): void {
  if (!isWhatsappWebhookVerbose()) return;
  console.log(...args);
}

export function isBillingInternalLogEnabled(): boolean {
  return process.env.BILLING_INTERNAL_LOG === "1";
}

export function logBillingInternalDebug(route: string, tenantId: string | undefined, raw: unknown): void {
  if (!isBillingInternalLogEnabled()) return;
  console.log("[billing_internal]", { route, tenantId, data: raw });
}
