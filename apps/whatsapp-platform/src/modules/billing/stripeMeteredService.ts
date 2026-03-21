/**
 * Stripe metered billing — legacy compatibility.
 * Migrated to meter events: use reportMessageUsage/reportAiUsage from application layer.
 * @deprecated Use stripeMeterClient and reportMessageUsage/reportAiUsage instead.
 */

import { isMeterEventsConfigured } from "@/modules/billing/infrastructure/stripeMeterClient";

export function getMeteredPriceIds(): { messages: string | null; ai: string | null } {
  const isDev = process.env.NODE_ENV !== "production";
  const msg: string | null =
    (isDev ? process.env.WHATSAPP_STRIPE_TEST_METERED_PRICE_MESSAGES : null) ??
    process.env.WHATSAPP_STRIPE_METERED_PRICE_MESSAGES ??
    (isDev ? process.env.STRIPE_TEST_METERED_PRICE_MESSAGES : null) ??
    process.env.STRIPE_METERED_PRICE_MESSAGES ??
    null;
  const ai: string | null =
    (isDev ? process.env.WHATSAPP_STRIPE_TEST_METERED_PRICE_AI : null) ??
    process.env.WHATSAPP_STRIPE_METERED_PRICE_AI ??
    (isDev ? process.env.STRIPE_TEST_METERED_PRICE_AI : null) ??
    process.env.STRIPE_METERED_PRICE_AI ??
    null;
  return { messages: msg, ai: ai };
}

/** @deprecated Use isMeterEventsConfigured from infrastructure/stripeMeterClient */
export function isMeteredBillingConfigured(): boolean {
  return isMeterEventsConfigured();
}

/**
 * Retry pending UsageEvent reports to Stripe.
 * Stub: meter events are handled by reportMessageUsage/reportAiUsage.
 */
export async function retryPendingStripeUsageReports(
  _limit: number
): Promise<{ processed: number; succeeded: number }> {
  return { processed: 0, succeeded: 0 };
}
