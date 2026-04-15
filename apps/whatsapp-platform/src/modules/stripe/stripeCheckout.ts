/**
 * Checkout Stripe — cria sessão com reutilização de customer.
 */

import type Stripe from "stripe";
import { getStripe, getPriceId } from "./stripeClient";
import type { CheckoutSessionParams } from "./stripeTypes";

export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<{ checkoutUrl: string; sessionId?: string }> {
  const stripe = getStripe();
  const priceId = getPriceId(params.plan);

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      ...(params.userId && { userId: params.userId }),
      tenantId: params.tenantId,
      plan: params.plan,
    },
    subscription_data: {
      metadata: {
        ...(params.userId && { userId: params.userId }),
        tenantId: params.tenantId,
        plan: params.plan,
      },
    },
  };

  if (params.stripeCustomerId) {
    sessionParams.customer = params.stripeCustomerId;
  } else {
    sessionParams.customer_email = params.email;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  const checkoutUrl = session.url;
  if (!checkoutUrl) throw new Error("Stripe did not return a checkout URL");

  return { checkoutUrl, sessionId: session.id ?? undefined };
}
