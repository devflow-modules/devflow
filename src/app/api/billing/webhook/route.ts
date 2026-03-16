import type Stripe from "stripe";
import { NextRequest } from "next/server";
import { validateWebhook, parseWebhookEvent } from "@/modules/billing/adapters/payment/StripeAdapter";
import { BillingService } from "@/modules/billing/BillingService";
import * as BillingProfileRepository from "@/modules/billing/BillingProfileRepository";
import {
  trackPaymentCompleted,
  trackSubscriptionCancelled,
  trackSubscriptionCancelledPortal,
  trackSubscriptionUpdatedPortal,
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
    // -----------------------------------------------------------------------
    // checkout.session.completed — pagamento concluído, ativar plano
    // -----------------------------------------------------------------------
    if (parsed.type === "checkout.session.completed" && parsed.userId && parsed.planId) {
      await BillingService.setUserPlan(parsed.userId, parsed.planId);

      if (parsed.stripeCustomerId) {
        await BillingProfileRepository.upsertProfile(
          parsed.userId,
          parsed.stripeCustomerId,
          parsed.subscriptionId
        );
      }

      trackPaymentCompleted({ userId: parsed.userId, planId: parsed.planId });
    }

    // -----------------------------------------------------------------------
    // customer.subscription.updated — upgrade/downgrade via portal
    // -----------------------------------------------------------------------
    else if (parsed.type === "customer.subscription.updated" && parsed.userId) {
      if (parsed.planId) {
        await BillingService.setUserPlan(parsed.userId, parsed.planId);
        trackPaymentCompleted({ userId: parsed.userId, planId: parsed.planId });
        trackSubscriptionUpdatedPortal({ userId: parsed.userId, planId: parsed.planId });
      }

      if (parsed.stripeCustomerId && parsed.subscriptionId) {
        await BillingProfileRepository.upsertProfile(
          parsed.userId,
          parsed.stripeCustomerId,
          parsed.subscriptionId
        );
      } else if (parsed.subscriptionId) {
        await BillingProfileRepository.updateSubscriptionId(parsed.userId, parsed.subscriptionId);
      }
    }

    // -----------------------------------------------------------------------
    // customer.subscription.deleted — cancelamento, reverter para FREE
    // -----------------------------------------------------------------------
    else if (parsed.type === "customer.subscription.deleted" && parsed.userId) {
      await BillingService.setUserPlan(parsed.userId, "FREE");
      await BillingProfileRepository.clearSubscriptionId(parsed.userId);
      trackSubscriptionCancelled({ userId: parsed.userId });
      trackSubscriptionCancelledPortal({ userId: parsed.userId });
    }
  } catch (err) {
    console.error("[billing/webhook] Error processing event", parsed.type, err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
