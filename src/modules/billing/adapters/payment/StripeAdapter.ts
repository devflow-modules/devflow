/**
 * Adapter de pagamento Stripe: checkout session e webhooks.
 * Arquitetura permite trocar por Lemon, Paddle, Mercado Pago sem alterar o resto.
 */

import Stripe from "stripe";
import type {
  CreateCheckoutParams,
  CreateCheckoutResult,
  WebhookParsedEvent,
  PlanIdPaid,
} from "./types";

const getSecretKey = (): string => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return key;
};

const getWebhookSecret = (): string => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return secret;
};

const getPriceId = (planId: PlanIdPaid): string => {
  const envKey = planId === "PRO" ? "STRIPE_PRICE_PRO" : "STRIPE_PRICE_TEAM";
  const priceId = process.env[envKey];
  if (!priceId) throw new Error(`${envKey} is not set`);
  return priceId;
};

function getStripe(): Stripe {
  return new Stripe(getSecretKey());
}

/**
 * Cria uma sessão de checkout Stripe e retorna a URL para redirecionar o usuário.
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<CreateCheckoutResult> {
  const stripe = getStripe();
  const priceId = getPriceId(params.planId);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.userId,
    customer_email: params.email,
    metadata: { userId: params.userId, planId: params.planId },
    subscription_data: {
      metadata: { userId: params.userId, planId: params.planId },
    },
  });

  const checkoutUrl = session.url;
  if (!checkoutUrl) throw new Error("Stripe did not return a checkout URL");

  return { checkoutUrl, sessionId: session.id ?? undefined };
}

/**
 * Valida a assinatura do webhook e retorna o evento construído.
 */
export function validateWebhook(signature: string, payload: string | Buffer): Stripe.Event {
  const secret = getWebhookSecret();
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

/**
 * Extrai evento relevante para billing: tipo, userId, planId.
 */
export function parseWebhookEvent(event: Stripe.Event): WebhookParsedEvent | null {
  const type = event.type;

  if (type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = (session.metadata?.userId ?? session.client_reference_id) as string | undefined;
    const planId = session.metadata?.planId as PlanIdPaid | undefined;
    return { type, userId, planId };
  }

  if (type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const sub = invoice.subscription;
    const subscriptionId = typeof sub === "string" ? sub : sub?.id;
    return { type, subscriptionId };
  }

  if (type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId as string | undefined;
    const planId = subscription.metadata?.planId as PlanIdPaid | undefined;
    return {
      type,
      userId,
      planId: type === "customer.subscription.deleted" ? undefined : planId,
      subscriptionId: subscription.id,
    };
  }

  return null;
}

export const stripePaymentAdapter = {
  createCheckoutSession,
  validateWebhook,
  parseWebhookEvent,
};
