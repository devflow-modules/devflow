/**
 * Sincronização Stripe ↔ banco.
 * Webhook é a fonte da verdade. Atualiza BillingSubscription e TenantSubscription.
 * Quota counters reset when billing period changes.
 */

import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import type { LocalSubscriptionStatus } from "./stripeTypes";
import { upsertBillingSubscription } from "@/modules/billing/infrastructure/billingRepository";

function mapStripeStatusToLocal(stripeStatus: Stripe.Subscription["status"]): LocalSubscriptionStatus {
  switch (stripeStatus) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIAL";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    default:
      return "ACTIVE";
  }
}

function mapStripePlanToLocal(metadataPlan?: string | null): string {
  const p = (metadataPlan ?? "FREE").toUpperCase();
  if (p === "TEAM") return "SCALE";
  if (p === "STARTER") return "STARTER";
  if (p === "PRO") return "PRO";
  if (p === "SCALE") return "SCALE";
  return "FREE";
}

export async function syncSubscriptionFromStripe(
  tenantId: string,
  stripeCustomerId: string | null | undefined,
  subscription: Stripe.Subscription | null
): Promise<void> {
  const plan = subscription
    ? mapStripePlanToLocal(subscription.metadata?.plan)
    : "FREE";
  const status: LocalSubscriptionStatus = subscription
    ? mapStripeStatusToLocal(subscription.status)
    : "CANCELED";
  const currentPeriodStart = subscription?.current_period_start
    ? new Date(subscription.current_period_start * 1000)
    : null;
  const currentPeriodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  await prisma.$transaction([
    prisma.tenantSubscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        plan,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        stripeCustomerId: stripeCustomerId ?? null,
        stripeSubscriptionId: subscription?.id ?? null,
      },
      update: {
        plan,
        status,
        currentPeriodStart: currentPeriodStart ?? undefined,
        currentPeriodEnd: currentPeriodEnd ?? undefined,
        stripeCustomerId: stripeCustomerId ?? undefined,
        stripeSubscriptionId: subscription?.id ?? undefined,
      },
    }),
  ]);

  await upsertBillingSubscription(tenantId, {
    stripeCustomerId: stripeCustomerId ?? null,
    stripeSubscriptionId: subscription?.id ?? null,
    plan,
    status: subscription ? subscription.status : "canceled",
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
  });
}

export async function markSubscriptionPastDue(stripeCustomerId: string): Promise<void> {
  await prisma.tenantSubscription.updateMany({
    where: { stripeCustomerId },
    data: { status: "PAST_DUE" },
  });
  await prisma.billingSubscription.updateMany({
    where: { stripeCustomerId },
    data: { status: "past_due" },
  });
}
