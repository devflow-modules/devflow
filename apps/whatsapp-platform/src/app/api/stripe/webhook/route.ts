import Stripe from "stripe";
import { NextRequest } from "next/server";
import { validateWebhook, parseWebhookEvent } from "@devflow/billing-core";
import { prisma } from "@/lib/prisma";
import {
  syncBillingSubscriptionFromStripe,
  markSubscriptionPastDueByCustomerId,
} from "@/modules/billing/billingStripeSync";

export const dynamic = "force-dynamic";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_TEST_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY or STRIPE_TEST_SECRET_KEY is required");
  return new Stripe(key);
}

function getActiveUntilFromSubscription(subscription: Stripe.Subscription): Date | null {
  if (subscription.current_period_end) {
    return new Date(subscription.current_period_end * 1000);
  }
  return null;
}

async function resolveTenantId(
  event: Stripe.Event,
  parsed: ReturnType<typeof parseWebhookEvent>
): Promise<string | null> {
  if (parsed?.userId) return parsed.userId;
  let customerId = parsed?.stripeCustomerId;
  if (!customerId && event.type.startsWith("invoice.")) {
    const inv = event.data.object as Stripe.Invoice;
    customerId =
      typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? undefined;
  }
  if (!customerId && event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const uid = sub.metadata?.userId as string | undefined;
    if (uid) return uid;
    customerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? undefined;
  }
  if (!customerId) return null;
  const tenant = await prisma.tenant.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return tenant?.id ?? null;
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

  let event: Stripe.Event;
  try {
    event = validateWebhook(signature, payload) as Stripe.Event;
  } catch (err) {
    console.warn("[stripe/webhook] Invalid signature", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (
    event.type === "invoice.finalized" ||
    event.type === "invoice.paid" ||
    event.type === "invoice.payment_succeeded"
  ) {
    try {
      const inv = event.data.object as Stripe.Invoice;
      const subRef = inv.subscription;
      const subId = typeof subRef === "string" ? subRef : subRef?.id;
      if (subId) {
        await prisma.billingSubscription.updateMany({
          where: { stripeSubscriptionId: subId },
          data: {
            lastInvoiceId: inv.id,
            lastInvoiceStatus: inv.status ?? event.type,
            lastInvoiceAmountPaid: inv.amount_paid ?? undefined,
          },
        });
      }
    } catch (e) {
      console.warn("[stripe/webhook] invoice snapshot", e);
    }
  }

  if (event.type === "invoice.payment_failed") {
    const inv = event.data.object as Stripe.Invoice;
    const cid =
      typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? undefined;
    if (cid) {
      try {
        await markSubscriptionPastDueByCustomerId(cid);
      } catch (e) {
        console.error("[stripe/webhook] past_due", e);
      }
    }
    return new Response("OK", { status: 200 });
  }

  const parsed = parseWebhookEvent(event);
  const tenantId = await resolveTenantId(event, parsed);
  if (!tenantId || !parsed) {
    return new Response("OK", { status: 200 });
  }

  const stripe = getStripe();

  function mapPlanFromStripe(p: string): string {
    const x = p.toLowerCase();
    return x === "team" ? "scale" : x;
  }

  try {
    if (parsed.type === "checkout.session.completed" && parsed.planId) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          plan: mapPlanFromStripe(parsed.planId),
          stripeCustomerId: parsed.stripeCustomerId ?? undefined,
          activeUntil: null,
        },
      });
      const subId = parsed.subscriptionId;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const activeUntil = getActiveUntilFromSubscription(sub);
        if (activeUntil) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: { activeUntil },
          });
        }
        await syncBillingSubscriptionFromStripe(
          tenantId,
          parsed.stripeCustomerId ?? null,
          sub
        );
      }
    } else if (parsed.type === "customer.subscription.updated" && parsed.subscriptionId) {
      const sub = await stripe.subscriptions.retrieve(parsed.subscriptionId);
      const activeUntil = getActiveUntilFromSubscription(sub);
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          plan: parsed.planId ? mapPlanFromStripe(parsed.planId) : undefined,
          stripeCustomerId: parsed.stripeCustomerId ?? undefined,
          activeUntil: activeUntil ?? undefined,
        },
      });
      await syncBillingSubscriptionFromStripe(
        tenantId,
        parsed.stripeCustomerId ?? null,
        sub
      );
    } else if (parsed.type === "customer.subscription.deleted") {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { plan: "starter", activeUntil: null },
      });
      await prisma.billingSubscription.updateMany({
        where: { tenantId },
        data: {
          status: "canceled",
          stripeSubscriptionId: null,
          cancelAtPeriodEnd: false,
          stripeSubscriptionItemMsgId: null,
          stripeSubscriptionItemAiId: null,
        },
      });
    } else if (parsed.type === "invoice.payment_succeeded" && parsed.subscriptionId) {
      const sub = await stripe.subscriptions.retrieve(parsed.subscriptionId);
      const activeUntil = getActiveUntilFromSubscription(sub);
      if (activeUntil) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { activeUntil },
        });
      }
      await syncBillingSubscriptionFromStripe(
        tenantId,
        parsed.stripeCustomerId ?? null,
        sub
      );
    }
  } catch (err) {
    console.error("[stripe/webhook]", err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
