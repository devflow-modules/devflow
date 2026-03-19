/**
 * Cliente Stripe configurado com variáveis de ambiente.
 */

import Stripe from "stripe";

const secretKey =
  process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_TEST_SECRET_KEY;

export function getStripe(): Stripe {
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY or STRIPE_TEST_SECRET_KEY is required");
  }
  return new Stripe(secretKey);
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is required");
  return secret;
}

export function getPriceId(plan: "PRO" | "SCALE"): string {
  const key = plan === "PRO" ? "STRIPE_PRICE_PRO" : "STRIPE_PRICE_SCALE";
  const fallback = plan === "SCALE" ? "STRIPE_PRICE_TEAM" : key;
  const priceId = process.env[key] ?? process.env[fallback];
  if (!priceId) {
    throw new Error(`${key} or ${fallback} is required`);
  }
  return priceId;
}

export function isStripeConfigured(): boolean {
  return Boolean(secretKey);
}
