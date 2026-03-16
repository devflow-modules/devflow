import type Stripe from "stripe";
import { NextRequest } from "next/server";
import { validateWebhook, parseWebhookEvent } from "@devflow/billing-core";
import { BillingService } from "@/modules/billing/BillingService";
import * as BillingProfileRepository from "@/modules/billing/BillingProfileRepository";
import {
  trackPaymentCompleted,
  trackSubscriptionCancelled,
  trackSubscriptionCancelledPortal,
  trackSubscriptionUpdatedPortal,
  trackSubscriptionPendingCancellation,
  trackSubscriptionReactivated,
  trackCustomerUpdated,
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
    // checkout.session.completed — pagamento confirmado, ativar plano
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
    // customer.subscription.updated — upgrade, downgrade, cancelamento agendado ou reativação
    // -----------------------------------------------------------------------
    else if (parsed.type === "customer.subscription.updated" && parsed.userId) {
      // Cancelamento agendado para fim do período (cancel_at_period_end = true)
      // Plano permanece ativo até o fim do período — NÃO reverter para FREE agora.
      // O evento customer.subscription.deleted chegará quando expirar de fato.
      if (parsed.cancelAtPeriodEnd === true) {
        trackSubscriptionPendingCancellation({ userId: parsed.userId });
        console.info("[billing/webhook] Subscription scheduled to cancel at period end", {
          userId: parsed.userId,
          subscriptionId: parsed.subscriptionId,
        });
      }
      // Reativação — usuário cancelou o cancelamento antes do fim do período
      else if (parsed.cancelAtPeriodEnd === false && !parsed.planId) {
        trackSubscriptionReactivated({ userId: parsed.userId });
        console.info("[billing/webhook] Subscription reactivated", {
          userId: parsed.userId,
          subscriptionId: parsed.subscriptionId,
        });
      }
      // Upgrade ou downgrade de plano via portal
      else if (parsed.planId) {
        await BillingService.setUserPlan(parsed.userId, parsed.planId);
        trackPaymentCompleted({ userId: parsed.userId, planId: parsed.planId });
        trackSubscriptionUpdatedPortal({ userId: parsed.userId, planId: parsed.planId });
      }

      // Persistir customer/subscription IDs independente do sub-caso
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
    // customer.subscription.deleted — cancelamento efetivo, reverter para FREE
    // (dispara após cancel_at_period_end ou cancelamento imediato)
    // -----------------------------------------------------------------------
    else if (parsed.type === "customer.subscription.deleted" && parsed.userId) {
      await BillingService.setUserPlan(parsed.userId, "FREE");
      await BillingProfileRepository.clearSubscriptionId(parsed.userId);
      trackSubscriptionCancelled({ userId: parsed.userId });
      trackSubscriptionCancelledPortal({ userId: parsed.userId });
    }

    // -----------------------------------------------------------------------
    // customer.updated — cliente atualizou dados de pagamento/email no portal
    // Não altera plano; útil para rastreamento e sincronização futura.
    // -----------------------------------------------------------------------
    else if (parsed.type === "customer.updated" && parsed.stripeCustomerId) {
      trackCustomerUpdated({ stripeCustomerId: parsed.stripeCustomerId });
      console.info("[billing/webhook] Customer updated", {
        stripeCustomerId: parsed.stripeCustomerId,
        email: parsed.stripeCustomerEmail,
      });
    }
  } catch (err) {
    console.error("[billing/webhook] Error processing event", parsed.type, err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
