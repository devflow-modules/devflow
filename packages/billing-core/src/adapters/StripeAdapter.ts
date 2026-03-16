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
} from "../types";

/**
 * Em desenvolvimento, usa STRIPE_TEST_SECRET_KEY se disponível (cartões de teste).
 * Em produção, usa STRIPE_SECRET_KEY (chave live).
 */
const getSecretKey = (): string => {
  const isDev = process.env.NODE_ENV !== "production";
  const testKey = process.env.STRIPE_TEST_SECRET_KEY;
  const liveKey = process.env.STRIPE_SECRET_KEY;

  if (isDev && testKey) return testKey;
  if (liveKey) return liveKey;
  throw new Error("STRIPE_SECRET_KEY is not set");
};

const getWebhookSecret = (): string => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return secret;
};

const getPriceId = (planId: PlanIdPaid): string => {
  const isDev = process.env.NODE_ENV !== "production";
  const baseKey = planId === "PRO" ? "PRICE_PRO" : "PRICE_TEAM";
  const testKey = `STRIPE_TEST_${baseKey}`;
  const liveKey = `STRIPE_${baseKey}`;

  const priceId = (isDev && process.env[testKey]) ? process.env[testKey] : process.env[liveKey];
  if (!priceId) throw new Error(`${isDev ? testKey : liveKey} is not set`);
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
    const stripeCustomerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;
    const sub = session.subscription;
    const subscriptionId = typeof sub === "string" ? sub : sub?.id;
    return { type, userId, planId, stripeCustomerId, subscriptionId };
  }

  if (type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const sub = invoice.subscription;
    const subscriptionId = typeof sub === "string" ? sub : sub?.id;
    const stripeCustomerId =
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    return { type, subscriptionId, stripeCustomerId };
  }

  if (type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId as string | undefined;
    const planId = subscription.metadata?.planId as PlanIdPaid | undefined;
    const stripeCustomerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;
    return {
      type,
      userId,
      planId: type === "customer.subscription.deleted" ? undefined : planId,
      subscriptionId: subscription.id,
      stripeCustomerId,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  }

  if (type === "customer.updated") {
    const customer = event.data.object as Stripe.Customer;
    return {
      type,
      stripeCustomerId: customer.id,
      stripeCustomerEmail: typeof customer.email === "string" ? customer.email : undefined,
    };
  }

  return null;
}

export const stripePaymentAdapter = {
  createCheckoutSession,
  validateWebhook,
  parseWebhookEvent,
};
