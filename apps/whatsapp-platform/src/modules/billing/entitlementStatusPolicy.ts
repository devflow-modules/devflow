/**
 * Política explícita: quais status de subscrição concedem capabilities do plano pago.
 * Alinhado a TenantSubscription (ACTIVE|TRIAL) e Stripe BillingSubscription statuses.
 *
 * Ver docs/whatsapp-platform/ENTITLEMENT_STATUS_POLICY.md
 */

/** Status TenantSubscription (UPPER) que concedem entitlement do plano associado. */
export const TENANT_SUB_ENTITLED_STATUSES = new Set(["ACTIVE", "TRIAL"]);

/** Status BillingSubscription (Stripe lowercase) que concedem entitlement. */
export const BILLING_SUB_ENTITLED_STATUSES = new Set(["active", "trialing"]);

/** Status conhecidos que NÃO concedem plano pago (fail-closed). */
export const BILLING_SUB_NON_ENTITLED_STATUSES = new Set([
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
  "inactive",
]);

export const TENANT_SUB_NON_ENTITLED_STATUSES = new Set(["CANCELED", "PAST_DUE", "INACTIVE"]);

export function isTenantSubscriptionStatusEntitled(status: string | null | undefined): boolean {
  if (!status) return false;
  return TENANT_SUB_ENTITLED_STATUSES.has(status.toUpperCase());
}

export function isBillingSubscriptionStatusEntitled(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  if (BILLING_SUB_ENTITLED_STATUSES.has(s)) return true;
  if (BILLING_SUB_NON_ENTITLED_STATUSES.has(s)) return false;
  // Unknown Stripe status → fail-closed (não entitlar)
  return false;
}
