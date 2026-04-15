/**
 * Tipos para integração Stripe.
 */

export type StripePlanKey = "OPERATIONAL_BASE" | "PRO" | "SCALE";

export type LocalSubscriptionStatus =
  | "ACTIVE"
  | "TRIAL"
  | "PAST_DUE"
  | "CANCELED"
  | "free";

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  pricePro: string;
  priceScale: string;
}

export interface CheckoutSessionParams {
  userId?: string;
  tenantId: string;
  email: string;
  plan: StripePlanKey;
  successUrl: string;
  cancelUrl: string;
  stripeCustomerId?: string | null;
}
