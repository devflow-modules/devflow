import type Stripe from "stripe";
import { NextRequest } from "next/server";
import { validateWebhook } from "@devflow/billing-core";
import { processStripeWebhookEventWithIdempotency } from "@/modules/billing/stripeWebhookProcessor";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  let payload: string;
  try {
    payload = await request.text();
  } catch {
    return new Response("Invalid body", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = validateWebhook(signature, payload);
  } catch (err) {
    console.warn("[billing/webhook] Invalid signature", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    await processStripeWebhookEventWithIdempotency(event);
  } catch (err) {
    console.error("[billing/webhook] Error processing event", event.type, err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
