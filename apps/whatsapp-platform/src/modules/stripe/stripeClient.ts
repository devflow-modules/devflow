/**
 * Cliente Stripe configurado com variáveis de ambiente.
 * Namespace WHATSAPP_* (preferido) com fallback para nomes legados.
 */

import Stripe from "stripe";

/** Em dev: usa apenas TEST. Em prod: usa apenas LIVE. Evita mistura de ambientes. */
function getSecretKey(): string | undefined {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    return (
      process.env.WHATSAPP_STRIPE_SECRET_KEY ??
      process.env.STRIPE_SECRET_KEY ??
      undefined
    );
  }
  return (
    process.env.WHATSAPP_STRIPE_TEST_SECRET_KEY ??
    process.env.STRIPE_TEST_SECRET_KEY ??
    undefined
  );
}

export function getStripe(): Stripe {
  const secretKey = getSecretKey();
  if (!secretKey) {
    throw new Error(
      "WHATSAPP_STRIPE_SECRET_KEY or WHATSAPP_STRIPE_TEST_SECRET_KEY (or STRIPE_* legacy) is required"
    );
  }
  return new Stripe(secretKey);
}

/** Em dev: usa webhook TEST. Em prod: usa webhook LIVE. */
export function getWebhookSecret(): string {
  const isProd = process.env.NODE_ENV === "production";
  const secret = isProd
    ? (process.env.WHATSAPP_STRIPE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET ?? "")
    : (process.env.WHATSAPP_STRIPE_TEST_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET ?? "");
  if (!secret) {
    throw new Error(
      "WHATSAPP_STRIPE_WEBHOOK_SECRET (or STRIPE_WEBHOOK_SECRET legacy) is required"
    );
  }
  return secret;
}

/** Em dev: usa TEST price IDs. Em prod: usa LIVE price IDs. */
export function getPriceId(plan: "STARTER" | "PRO" | "SCALE"): string {
  const isProd = process.env.NODE_ENV === "production";
  if (plan === "STARTER") {
    const priceId = isProd
      ? (process.env.WHATSAPP_STRIPE_PRICE_STARTER ?? "")
      : (process.env.WHATSAPP_STRIPE_TEST_PRICE_STARTER ?? process.env.WHATSAPP_STRIPE_PRICE_STARTER ?? "");
    if (!priceId) throw new Error("WHATSAPP_STRIPE_PRICE_STARTER (ou TEST em dev) is required");
    return priceId;
  }
  if (plan === "PRO") {
    const priceId = isProd
      ? (process.env.WHATSAPP_STRIPE_PRICE_PRO ?? process.env.STRIPE_PRICE_PRO ?? "")
      : (process.env.WHATSAPP_STRIPE_TEST_PRICE_PRO ?? process.env.WHATSAPP_STRIPE_PRICE_PRO ?? process.env.STRIPE_TEST_PRICE_PRO ?? "");
    if (!priceId) throw new Error("WHATSAPP_STRIPE_PRICE_PRO (ou TEST em dev) is required");
    return priceId;
  }
  const priceId = isProd
    ? (process.env.WHATSAPP_STRIPE_PRICE_SCALE ?? process.env.WHATSAPP_STRIPE_PRICE_TEAM ?? process.env.STRIPE_PRICE_SCALE ?? process.env.STRIPE_PRICE_TEAM ?? "")
    : (process.env.WHATSAPP_STRIPE_TEST_PRICE_SCALE ?? process.env.WHATSAPP_STRIPE_TEST_PRICE_TEAM ?? process.env.WHATSAPP_STRIPE_PRICE_SCALE ?? process.env.WHATSAPP_STRIPE_PRICE_TEAM ?? process.env.STRIPE_TEST_PRICE_SCALE ?? process.env.STRIPE_TEST_PRICE_TEAM ?? "");
  if (!priceId) throw new Error("WHATSAPP_STRIPE_PRICE_SCALE (ou TEST em dev) is required");
  return priceId;
}

export function isStripeConfigured(): boolean {
  return Boolean(getSecretKey());
}
