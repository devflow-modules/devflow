import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { normalizePlanKey } from "./planConfig";
import {
  ensureMeteredItemsOnSubscription,
  isMeteredBillingConfigured,
} from "./stripeMeteredService";

function mapStripePlanToProductPlan(metaPlan?: string | null): string {
  const p = (metaPlan ?? "PRO").toUpperCase();
  if (p === "TEAM") return "SCALE";
  return p === "PRO" ? "PRO" : normalizePlanKey(p);
}

export async function syncBillingSubscriptionFromStripe(
  tenantId: string,
  stripeCustomerId: string | null | undefined,
  subscription: Stripe.Subscription | null
): Promise<void> {
  if (!subscription) {
    await prisma.billingSubscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        stripeCustomerId: stripeCustomerId ?? null,
        stripeSubscriptionId: null,
        plan: "FREE",
        status: "active",
      },
      update: {
        ...(stripeCustomerId ? { stripeCustomerId } : {}),
      },
    });
    return;
  }

  const plan = mapStripePlanToProductPlan(subscription.metadata?.planId);
  const start = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000)
    : null;
  const end = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  await prisma.billingSubscription.upsert({
    where: { tenantId },
    create: {
      tenantId,
      stripeCustomerId: stripeCustomerId ?? null,
      stripeSubscriptionId: subscription.id,
      plan,
      status: subscription.status,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    },
    update: {
      stripeCustomerId: stripeCustomerId ?? undefined,
      stripeSubscriptionId: subscription.id,
      plan,
      status: subscription.status,
      currentPeriodStart: start ?? undefined,
      currentPeriodEnd: end ?? undefined,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    },
  });

  if (isMeteredBillingConfigured() && subscription.status !== "canceled") {
    try {
      await ensureMeteredItemsOnSubscription(tenantId, subscription.id);
    } catch (e) {
      console.warn("[billing] ensureMeteredItemsOnSubscription", tenantId, e);
    }
  }
}

export async function markSubscriptionPastDueByCustomerId(stripeCustomerId: string): Promise<void> {
  await prisma.billingSubscription.updateMany({
    where: { stripeCustomerId },
    data: { status: "past_due" },
  });
}
