/**
 * Adapter do Stripe Customer Portal.
 * Cria sessões de self-service para o usuário gerenciar sua assinatura.
 * Arquitetura permite substituição por outro gateway sem alterar o serviço.
 *
 * Live financial ops require verified Vercel Production — see stripeRuntimePolicy.
 */

import Stripe from "stripe";
import type {
  CreateCustomerPortalParams,
  CreateCustomerPortalResult,
  CustomerPortalAdapter,
} from "../types";
import { assertStripeSecretKeyAllowed } from "../stripeRuntimePolicy";

function getSecretKey(): string {
  const preferTestVars = process.env.NODE_ENV !== "production";
  const testKey = process.env.STRIPE_TEST_SECRET_KEY;
  const liveKey = process.env.STRIPE_SECRET_KEY;
  if (preferTestVars && testKey) return testKey;
  if (liveKey) return liveKey;
  throw new Error("STRIPE_SECRET_KEY is not set");
}

function getStripe(): Stripe {
  const secretKey = getSecretKey();
  assertStripeSecretKeyAllowed(secretKey);
  return new Stripe(secretKey);
}

export async function createCustomerPortalSession(
  params: CreateCustomerPortalParams
): Promise<CreateCustomerPortalResult> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: params.returnUrl,
  });

  const portalUrl = session.url;
  if (!portalUrl) throw new Error("Stripe did not return a portal URL");

  return { portalUrl };
}

export const stripeCustomerPortalAdapter: CustomerPortalAdapter = {
  createCustomerPortalSession,
};
