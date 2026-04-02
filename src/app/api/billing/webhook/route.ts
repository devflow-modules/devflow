/**
 * Webhook Stripe na raiz do portal.
 *
 * Com `NEXT_PUBLIC_FINANCEIRO_APP_URL` definido: **proxy transparente** para
 * `POST {APP_URL}/api/billing/webhook` — processamento canónico (idempotência,
 * tenant_subscription) só em `apps/financeiro`. O URL no Stripe Dashboard pode
 * permanecer no portal até migrares para o host do app.
 *
 * Sem essa env (legado / dev só portal): valida assinatura e aplica a lógica
 * antiga (`parseWebhookEvent` + UserPlan na raiz).
 */
import type Stripe from "stripe";
import { NextRequest } from "next/server";
import { validateWebhook, parseWebhookEvent } from "@devflow/billing-core";
import { financeiroAppUrl } from "@/lib/financeiro-app-url";
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

const FORWARD_TIMEOUT_MS = 25_000;

function financeiroWebhookForwardTarget(): string | null {
  const raw = process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL?.trim();
  if (!raw) return null;
  const path = financeiroAppUrl("/api/billing/webhook");
  if (!path.startsWith("http://") && !path.startsWith("https://")) return null;
  return path;
}

async function forwardToFinanceiroApp(
  targetUrl: string,
  signature: string,
  payload: string
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FORWARD_TIMEOUT_MS);
  try {
    return await fetch(targetUrl, {
      method: "POST",
      headers: {
        "stripe-signature": signature,
        "Content-Type": "application/json",
      },
      body: payload,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

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

  const forwardUrl = financeiroWebhookForwardTarget();
  if (forwardUrl) {
    try {
      const res = await forwardToFinanceiroApp(forwardUrl, signature, payload);
      const text = await res.text();
      return new Response(text, { status: res.status });
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      console.error(
        "[billing/webhook] Forward to Financeiro app failed",
        aborted ? "timeout" : err
      );
      return new Response(aborted ? "Webhook forward timeout" : "Webhook forward error", {
        status: 502,
      });
    }
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

      if (parsed.stripeCustomerId) {
        await BillingProfileRepository.upsertProfile(
          parsed.userId,
          parsed.stripeCustomerId,
          parsed.subscriptionId
        );
      }

      trackPaymentCompleted({ userId: parsed.userId, planId: parsed.planId });
    } else if (parsed.type === "customer.subscription.updated" && parsed.userId) {
      if (parsed.cancelAtPeriodEnd === true) {
        trackSubscriptionPendingCancellation({ userId: parsed.userId });
        console.info("[billing/webhook] Subscription scheduled to cancel at period end", {
          userId: parsed.userId,
          subscriptionId: parsed.subscriptionId,
        });
      } else if (parsed.cancelAtPeriodEnd === false && !parsed.planId) {
        trackSubscriptionReactivated({ userId: parsed.userId });
        console.info("[billing/webhook] Subscription reactivated", {
          userId: parsed.userId,
          subscriptionId: parsed.subscriptionId,
        });
      } else if (parsed.planId) {
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
    } else if (parsed.type === "customer.subscription.deleted" && parsed.userId) {
      await BillingService.setUserPlan(parsed.userId, "FREE");
      await BillingProfileRepository.clearSubscriptionId(parsed.userId);
      trackSubscriptionCancelled({ userId: parsed.userId });
      trackSubscriptionCancelledPortal({ userId: parsed.userId });
    } else if (parsed.type === "customer.updated" && parsed.stripeCustomerId) {
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
