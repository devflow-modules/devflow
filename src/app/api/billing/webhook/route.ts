import type Stripe from "stripe";
import { NextRequest } from "next/server";
import { validateWebhook, parseWebhookEvent } from "@/modules/billing/adapters/payment/StripeAdapter";
import { BillingService } from "@/modules/billing/BillingService";
import {
  trackPaymentCompleted,
  trackSubscriptionCancelled,
} from "@/modules/billing/billingAnalytics";

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

  const parsed = parseWebhookEvent(event);
  if (!parsed) {
    return new Response("OK", { status: 200 });
  }

  try {
    if (parsed.type === "checkout.session.completed" && parsed.userId && parsed.planId) {
      await BillingService.setUserPlan(parsed.userId, parsed.planId);
      trackPaymentCompleted({ userId: parsed.userId, planId: parsed.planId });
    } else if (
      parsed.type === "customer.subscription.updated" &&
      parsed.userId &&
      parsed.planId
    ) {
      await BillingService.setUserPlan(parsed.userId, parsed.planId);
      trackPaymentCompleted({ userId: parsed.userId, planId: parsed.planId });
    } else if (parsed.type === "customer.subscription.deleted" && parsed.userId) {
      await BillingService.setUserPlan(parsed.userId, "FREE");
      trackSubscriptionCancelled({ userId: parsed.userId });
    }
  } catch (err) {
    console.error("[billing/webhook] Error processing event", parsed.type, err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
