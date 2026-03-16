/**
 * Adapter do Stripe Customer Portal.
 * Cria sessões de self-service para o usuário gerenciar sua assinatura.
 * Arquitetura permite substituição por outro gateway sem alterar o serviço.
 */

import Stripe from "stripe";
import type {
  CreateCustomerPortalParams,
  CreateCustomerPortalResult,
  CustomerPortalAdapter,
} from "./types";

function getSecretKey(): string {
  const isDev = process.env.NODE_ENV !== "production";
  const testKey = process.env.STRIPE_TEST_SECRET_KEY;
  const liveKey = process.env.STRIPE_SECRET_KEY;
  if (isDev && testKey) return testKey;
  if (liveKey) return liveKey;
  throw new Error("STRIPE_SECRET_KEY is not set");
}

function getStripe(): Stripe {
  return new Stripe(getSecretKey());
}

export async function createCustomerPortalSession(
  params: CreateCustomerPortalParams
): Promise<CreateCustomerPortalResult> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: params.returnUrl,
  });

  return { portalUrl: session.url };
}

export const stripeCustomerPortalAdapter: CustomerPortalAdapter = {
  createCustomerPortalSession,
};
