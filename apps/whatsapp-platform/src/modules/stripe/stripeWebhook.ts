/**
 * Webhook Stripe — validação e parsing.
 * Usar raw body para validação da assinatura.
 */

import type Stripe from "stripe";
import { getStripe, getWebhookSecret } from "./stripeClient";

export function validateWebhook(signature: string, payload: string | Buffer): Stripe.Event {
  const stripe = getStripe();
  const secret = getWebhookSecret();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

export type ParsedWebhookEvent = {
  type: string;
  tenantId?: string;
  plan?: string;
  subscriptionId?: string;
  stripeCustomerId?: string;
  cancelAtPeriodEnd?: boolean;
};

/**
 * Extrai dados relevantes do evento para billing.
 * Retorna null se o evento não for relevante.
 */
export function parseWebhookEvent(event: Stripe.Event): ParsedWebhookEvent | null {
  const type = event.type;

  if (type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const tenantId =
      (session.metadata?.tenantId as string) ?? (session.metadata?.userId as string) ?? undefined;
    const plan = (session.metadata?.plan ?? session.metadata?.planId) as string | undefined;
    const stripeCustomerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;
    const sub = session.subscription;
    const subscriptionId = typeof sub === "string" ? sub : sub?.id;
    return { type, tenantId, plan, stripeCustomerId, subscriptionId };
  }

  if (type === "customer.subscription.created") {
    const subscription = event.data.object as Stripe.Subscription;
    const tenantId =
      (subscription.metadata?.tenantId as string) ?? (subscription.metadata?.userId as string) ?? undefined;
    const plan = subscription.metadata?.plan as string | undefined;
    const stripeCustomerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;
    return {
      type,
      tenantId,
      plan,
      subscriptionId: subscription.id,
      stripeCustomerId,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  }

  if (type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const tenantId =
      (subscription.metadata?.tenantId as string) ?? (subscription.metadata?.userId as string) ?? undefined;
    const plan =
      type === "customer.subscription.deleted"
        ? undefined
        : (subscription.metadata?.plan ?? subscription.metadata?.planId) as string | undefined;
    const stripeCustomerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;
    return {
      type,
      tenantId,
      plan,
      subscriptionId: subscription.id,
      stripeCustomerId,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  }

  if (type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeCustomerId =
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    const sub = invoice.subscription;
    const subscriptionId = typeof sub === "string" ? sub : sub?.id;
    return { type, stripeCustomerId, subscriptionId };
  }

  if (type === "invoice.payment_succeeded" || type === "invoice.upcoming") {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeCustomerId =
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    const sub = invoice.subscription;
    const subscriptionId = typeof sub === "string" ? sub : sub?.id;
    return { type, stripeCustomerId, subscriptionId };
  }

  return null;
}
