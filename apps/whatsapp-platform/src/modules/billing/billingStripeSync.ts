import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { normalizePlanKey } from "./planConfig";
import { upsertBillingSubscription } from "./infrastructure/billingRepository";

function mapStripePlanToProductPlan(metaPlan?: string | null): string {
  const p = (metaPlan ?? "FREE").toUpperCase();
  if (p === "TEAM") return "SCALE";
  if (p === "STARTER") return "STARTER";
  if (p === "PRO") return "PRO";
  if (p === "SCALE") return "SCALE";
  return normalizePlanKey(p);
}

export async function syncBillingSubscriptionFromStripe(
  tenantId: string,
  stripeCustomerId: string | null | undefined,
  subscription: Stripe.Subscription | null
): Promise<void> {
  if (!subscription) {
    await upsertBillingSubscription(tenantId, {
      stripeCustomerId: stripeCustomerId ?? null,
      stripeSubscriptionId: null,
      plan: "FREE",
      status: "active",
    });
    return;
  }

  const plan = mapStripePlanToProductPlan(
    subscription.metadata?.plan ?? subscription.metadata?.planId
  );
  const start = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000)
    : null;
  const end = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  await upsertBillingSubscription(tenantId, {
    stripeCustomerId: stripeCustomerId ?? null,
    stripeSubscriptionId: subscription.id,
    plan,
    status: subscription.status,
    currentPeriodStart: start,
    currentPeriodEnd: end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
  });
}

export async function markSubscriptionPastDueByCustomerId(stripeCustomerId: string): Promise<void> {
  await prisma.billingSubscription.updateMany({
    where: { stripeCustomerId },
    data: { status: "past_due" },
  });
}
