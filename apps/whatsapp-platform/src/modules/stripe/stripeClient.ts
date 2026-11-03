/**
 * Cliente Stripe configurado com variáveis de ambiente.
 * Namespace WHATSAPP_* (preferido) com fallback para nomes legados.
 *
 * NODE_ENV only selects which env var names to read (LIVE vs TEST names).
 * Authorization is fail-closed via @devflow/billing-core stripeRuntimePolicy:
 * Live keys require verified Vercel Production; Preview/unknown deny all Stripe.
 */

import Stripe from "stripe";
import {
  assertStripeSecretKeyAllowed,
  assertStripeWebhookProcessingAllowed,
  isStripeSecretKeyAllowed,
} from "@devflow/billing-core";

/** Prefer LIVE var names when NODE_ENV=production; otherwise prefer TEST var names. */
function getSecretKey(): string | undefined {
  const preferLiveVarNames = process.env.NODE_ENV === "production";
  if (preferLiveVarNames) {
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
  assertStripeSecretKeyAllowed(secretKey);
  return new Stripe(secretKey);
}

/** Prefer LIVE webhook secret names when NODE_ENV=production; otherwise TEST names. */
export function getWebhookSecret(): string {
  assertStripeWebhookProcessingAllowed();
  const preferLiveVarNames = process.env.NODE_ENV === "production";
  const secret = preferLiveVarNames
    ? (process.env.WHATSAPP_STRIPE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET ?? "")
    : (process.env.WHATSAPP_STRIPE_TEST_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET ?? "");
  if (!secret) {
    throw new Error(
      "WHATSAPP_STRIPE_WEBHOOK_SECRET (or STRIPE_WEBHOOK_SECRET legacy) is required"
    );
  }
  return secret;
}

function readScalePriceId(preferLiveVarNames: boolean): string {
  return preferLiveVarNames
    ? (process.env.WHATSAPP_STRIPE_PRICE_SCALE ?? process.env.WHATSAPP_STRIPE_PRICE_TEAM ?? process.env.STRIPE_PRICE_SCALE ?? process.env.STRIPE_PRICE_TEAM ?? "")
    : (process.env.WHATSAPP_STRIPE_TEST_PRICE_SCALE ?? process.env.WHATSAPP_STRIPE_TEST_PRICE_TEAM ?? process.env.WHATSAPP_STRIPE_PRICE_SCALE ?? process.env.WHATSAPP_STRIPE_PRICE_TEAM ?? process.env.STRIPE_TEST_PRICE_SCALE ?? process.env.STRIPE_TEST_PRICE_TEAM ?? "");
}

/** Prefer LIVE price IDs when NODE_ENV=production; otherwise prefer TEST price IDs. */
export function getPriceId(plan: "OPERATIONAL_BASE" | "PRO" | "SCALE" | "STARTER"): string {
  const preferLiveVarNames = process.env.NODE_ENV === "production";
  if (plan === "OPERATIONAL_BASE") {
    const priceId = preferLiveVarNames
      ? (process.env.WHATSAPP_STRIPE_PRICE_OPERATIONAL_BASE ?? process.env.WHATSAPP_STRIPE_PRICE_SCALE ?? "")
      : (process.env.WHATSAPP_STRIPE_TEST_PRICE_OPERATIONAL_BASE ??
          process.env.WHATSAPP_STRIPE_TEST_PRICE_SCALE ??
          process.env.WHATSAPP_STRIPE_PRICE_OPERATIONAL_BASE ??
          "");
    if (priceId) return priceId;
    const fallback = readScalePriceId(preferLiveVarNames);
    if (!fallback) throw new Error("WHATSAPP_STRIPE_PRICE_OPERATIONAL_BASE ou WHATSAPP_STRIPE_PRICE_SCALE (TEST em dev) is required");
    return fallback;
  }
  if (plan === "STARTER") {
    const priceId = preferLiveVarNames
      ? (process.env.WHATSAPP_STRIPE_PRICE_STARTER ?? "")
      : (process.env.WHATSAPP_STRIPE_TEST_PRICE_STARTER ?? process.env.WHATSAPP_STRIPE_PRICE_STARTER ?? "");
    if (!priceId) throw new Error("WHATSAPP_STRIPE_PRICE_STARTER (ou TEST em dev) is required");
    return priceId;
  }
  if (plan === "PRO") {
    const priceId = preferLiveVarNames
      ? (process.env.WHATSAPP_STRIPE_PRICE_PRO ?? process.env.STRIPE_PRICE_PRO ?? "")
      : (process.env.WHATSAPP_STRIPE_TEST_PRICE_PRO ?? process.env.WHATSAPP_STRIPE_PRICE_PRO ?? process.env.STRIPE_TEST_PRICE_PRO ?? "");
    if (!priceId) throw new Error("WHATSAPP_STRIPE_PRICE_PRO (ou TEST em dev) is required");
    return priceId;
  }
  const priceId = readScalePriceId(preferLiveVarNames);
  if (!priceId) throw new Error("WHATSAPP_STRIPE_PRICE_SCALE (ou TEST em dev) is required");
  return priceId;
}

/** True when a secret is present and the runtime policy allows using it. */
export function isStripeConfigured(): boolean {
  const secretKey = getSecretKey();
  if (!secretKey) return false;
  return isStripeSecretKeyAllowed(secretKey);
}
