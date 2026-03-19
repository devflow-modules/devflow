import type Stripe from "stripe";
import { NextRequest } from "next/server";
import { getStripe } from "@/modules/stripe/stripeClient";
import { validateWebhook, parseWebhookEvent } from "@/modules/stripe/stripeWebhook";
import {
  syncSubscriptionFromStripe,
  markSubscriptionPastDue,
} from "@/modules/stripe/stripeSyncService";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function mapPlanToLocal(plan?: string | null): string {
  const p = (plan ?? "FREE").toUpperCase();
  if (p === "TEAM") return "SCALE";
  return p === "PRO" ? "PRO" : p === "SCALE" ? "SCALE" : "FREE";
}

async function resolveTenantId(
  parsed: { tenantId?: string; stripeCustomerId?: string } | null
): Promise<string | null> {
  if (!parsed) return null;
  if (parsed.tenantId) return parsed.tenantId;
  if (!parsed.stripeCustomerId) return null;
  const tenant = await prisma.tenant.findFirst({
    where: { stripeCustomerId: parsed.stripeCustomerId },
    select: { id: true },
  });
  return tenant?.id ?? null;
}

async function resolveTenantIdFromCustomer(stripeCustomerId: string): Promise<string | null> {
  const [tenantByCustomer, tenantBySub, billingBySub] = await Promise.all([
    prisma.tenant.findFirst({
      where: { stripeCustomerId },
      select: { id: true },
    }),
    prisma.tenantSubscription.findFirst({
      where: { stripeCustomerId },
      select: { tenantId: true },
    }),
    prisma.billingSubscription.findFirst({
      where: { stripeCustomerId },
      select: { tenantId: true },
    }),
  ]);
  return tenantByCustomer?.id ?? tenantBySub?.tenantId ?? billingBySub?.tenantId ?? null;
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

  const parsed = parseWebhookEvent(event);

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
        await markSubscriptionPastDue(cid);
      } catch (e) {
        console.error("[stripe/webhook] past_due", e);
      }
    }
    return new Response("OK", { status: 200 });
  }

  const tenantId =
    parsed?.tenantId ?? (await resolveTenantId(parsed)) ?? null;

  if (!tenantId && !parsed?.stripeCustomerId) {
    return new Response("OK", { status: 200 });
  }

  const stripe = getStripe();

  try {
    if (
      (event.type === "checkout.session.completed" || event.type === "customer.subscription.created") &&
      parsed
    ) {
      const resolvedTenantId =
        tenantId ?? (parsed.stripeCustomerId ? await resolveTenantIdFromCustomer(parsed.stripeCustomerId) : null);
      if (!resolvedTenantId) {
        return new Response("OK", { status: 200 });
      }

      const plan = mapPlanToLocal(parsed.plan);
      await prisma.tenant.update({
        where: { id: resolvedTenantId },
        data: {
          plan: plan.toLowerCase(),
          stripeCustomerId: parsed.stripeCustomerId ?? undefined,
          activeUntil: null,
        },
      });

      if (parsed.subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(parsed.subscriptionId);
        const activeUntil = sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null;
        if (activeUntil) {
          await prisma.tenant.update({
            where: { id: resolvedTenantId },
            data: { activeUntil },
          });
        }
        await syncSubscriptionFromStripe(
          resolvedTenantId,
          parsed.stripeCustomerId ?? null,
          sub
        );
      }
    } else if (
      event.type === "customer.subscription.updated" &&
      parsed?.subscriptionId
    ) {
      const resolvedTenantId =
        tenantId ?? (parsed.stripeCustomerId ? await resolveTenantIdFromCustomer(parsed.stripeCustomerId) : null);
      if (!resolvedTenantId) {
        return new Response("OK", { status: 200 });
      }

      const sub = await stripe.subscriptions.retrieve(parsed.subscriptionId);
      const plan = parsed.plan ? mapPlanToLocal(parsed.plan) : undefined;
      const activeUntil = sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null;

      await prisma.tenant.update({
        where: { id: resolvedTenantId },
        data: {
          ...(plan ? { plan: plan.toLowerCase() } : {}),
          stripeCustomerId: parsed.stripeCustomerId ?? undefined,
          activeUntil: activeUntil ?? undefined,
        },
      });
      await syncSubscriptionFromStripe(
        resolvedTenantId,
        parsed.stripeCustomerId ?? null,
        sub
      );
    } else if (event.type === "customer.subscription.deleted") {
      const resolvedTenantId =
        tenantId ?? (parsed?.stripeCustomerId ? await resolveTenantIdFromCustomer(parsed.stripeCustomerId) : null);
      if (!resolvedTenantId) {
        return new Response("OK", { status: 200 });
      }

      await prisma.tenant.update({
        where: { id: resolvedTenantId },
        data: { plan: "starter", activeUntil: null },
      });
      await syncSubscriptionFromStripe(resolvedTenantId, null, null);
      await prisma.billingSubscription.updateMany({
        where: { tenantId: resolvedTenantId },
        data: {
          status: "canceled",
          stripeSubscriptionId: null,
          cancelAtPeriodEnd: false,
          stripeSubscriptionItemMsgId: null,
          stripeSubscriptionItemAiId: null,
        },
      });
    } else if (
      event.type === "invoice.payment_succeeded" &&
      parsed?.subscriptionId
    ) {
      const resolvedTenantId =
        tenantId ?? (parsed.stripeCustomerId ? await resolveTenantIdFromCustomer(parsed.stripeCustomerId) : null);
      if (!resolvedTenantId) {
        return new Response("OK", { status: 200 });
      }

      const sub = await stripe.subscriptions.retrieve(parsed.subscriptionId);
      const activeUntil = sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null;
      if (activeUntil) {
        await prisma.tenant.update({
          where: { id: resolvedTenantId },
          data: { activeUntil },
        });
      }
      await syncSubscriptionFromStripe(
        resolvedTenantId,
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
