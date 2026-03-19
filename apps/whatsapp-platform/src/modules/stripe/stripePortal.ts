/**
 * Customer Portal Stripe — self-service para gerenciar assinatura.
 */

import { getStripe } from "./stripeClient";

export async function createPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<{ portalUrl: string }> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  const portalUrl = session.url;
  if (!portalUrl) throw new Error("Stripe did not return a portal URL");

  return { portalUrl };
}
