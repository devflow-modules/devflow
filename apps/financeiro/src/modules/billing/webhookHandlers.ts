import type Stripe from "stripe";
import { prisma } from "@/modules/financeiro/lib/db";
import { BillingService } from "./BillingService";
import * as BillingProfileRepository from "./BillingProfileRepository";
import { syncUserPlanFromTenant } from "./billingSync";
import { mapPriceToPlan } from "./planMapper";
import * as tenantSubscriptionService from "./tenantSubscriptionService";
import {
  trackPaymentCompleted,
  trackSubscriptionCancelled,
  trackSubscriptionCancelledPortal,
  trackSubscriptionUpdatedPortal,
  trackSubscriptionPendingCancellation,
  trackSubscriptionReactivated,
  trackCustomerUpdated,
} from "./billingAnalytics";

function stripeTsToDate(ts: number | undefined | null): Date | null {
  if (ts == null) return null;
  return new Date(ts * 1000);
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): string {
  const allowed = new Set([
    "inactive",
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
  ]);
  const m: Record<string, string> = {
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "unpaid",
    incomplete: "inactive",
    incomplete_expired: "inactive",
    paused: "inactive",
  };
  const v = m[status] ?? "inactive";
  return allowed.has(v) ? v : "inactive";
}

function metaPlanFromSession(session: Stripe.Checkout.Session): string {
  const raw = session.metadata?.planCode?.toLowerCase();
  if (raw === "pro" || raw === "team" || raw === "free") return raw;
  const pid = session.metadata?.planId;
  if (pid === "PRO") return "pro";
  if (pid === "TEAM") return "team";
  return "free";
}

function resolveTenantFromSession(session: Stripe.Checkout.Session): string | undefined {
  return (
    (session.metadata?.tenantId as string | undefined) ??
    (session.metadata?.userId as string | undefined) ??
    (session.client_reference_id as string | undefined) ??
    undefined
  );
}

async function resolveTenantFromSubscription(sub: Stripe.Subscription): Promise<string | null> {
  const meta =
    (sub.metadata?.tenantId as string | undefined) ?? (sub.metadata?.userId as string | undefined);
  if (meta) return meta;

  const existing = await tenantSubscriptionService.findByStripeSubscriptionId(sub.id);
  if (existing) return existing.tenantId;

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (customerId) {
    const profile = await prisma.userBillingProfile.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (profile) return profile.userId;
  }
  return null;
}

function firstPriceId(sub: Stripe.Subscription): string | undefined {
  const item = sub.items?.data?.[0];
  const price = item?.price;
  return typeof price === "string" ? price : price?.id;
}

export async function handleCheckoutCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const tenantId = resolveTenantFromSession(session);
  if (!tenantId) return;

  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const subRef = session.subscription;
  const stripeSubscriptionId =
    typeof subRef === "string" ? subRef : subRef?.id ?? null;

  const planCode = metaPlanFromSession(session);

  await tenantSubscriptionService.upsertSubscription({
    tenantId,
    stripeCustomerId,
    stripeSubscriptionId,
    planCode,
    status: "active",
  });

  await BillingService.setUserPlan(tenantId, planCode === "team" ? "TEAM" : planCode === "pro" ? "PRO" : "FREE");

  if (stripeCustomerId) {
    await BillingProfileRepository.upsertProfile(tenantId, stripeCustomerId, stripeSubscriptionId ?? undefined);
  }

  const paidPlan = session.metadata?.planId as "PRO" | "TEAM" | undefined;
  if (paidPlan === "PRO" || paidPlan === "TEAM") {
    trackPaymentCompleted({ userId: tenantId, planId: paidPlan });
  }
}

export async function handleSubscriptionCreatedOrUpdated(event: Stripe.Event): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;
  const tenantId = await resolveTenantFromSubscription(sub);
  if (!tenantId) return;

  const priceId = firstPriceId(sub);
  const planFromPrice = priceId ? mapPriceToPlan(priceId) : "free";
  const metaPlan = sub.metadata?.planCode?.toLowerCase();
  const planCode =
    metaPlan === "pro" || metaPlan === "team"
      ? metaPlan
      : planFromPrice !== "free"
        ? planFromPrice
        : metaPlanFromPlanId(sub.metadata?.planId);

  const status = mapStripeSubscriptionStatus(sub.status);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

  await tenantSubscriptionService.upsertSubscription({
    tenantId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    stripePriceId: priceId ?? null,
    planCode,
    status,
    currentPeriodEnd: stripeTsToDate(sub.current_period_end),
    cancelAtPeriodEnd: sub.cancel_at_period_end === true,
  });

  if (customerId) {
    await BillingProfileRepository.upsertProfile(tenantId, customerId, sub.id);
  }

  if (sub.cancel_at_period_end === true) {
    trackSubscriptionPendingCancellation({ userId: tenantId });
    console.info("[billing/webhook] Subscription scheduled to cancel at period end", {
      userId: tenantId,
      subscriptionId: sub.id,
    });
    return;
  }

  if (
    event.type === "customer.subscription.updated" &&
    sub.cancel_at_period_end === false &&
    !sub.metadata?.planId
  ) {
    trackSubscriptionReactivated({ userId: tenantId });
    console.info("[billing/webhook] Subscription reactivated", { userId: tenantId, subscriptionId: sub.id });
  }

  const parsedPlanId = sub.metadata?.planId as "PRO" | "TEAM" | undefined;
  if (parsedPlanId === "PRO" || parsedPlanId === "TEAM") {
    await BillingService.setUserPlan(tenantId, parsedPlanId);
    trackPaymentCompleted({ userId: tenantId, planId: parsedPlanId });
    trackSubscriptionUpdatedPortal({ userId: tenantId, planId: parsedPlanId });
  } else {
    await syncUserPlanFromTenant(tenantId, planCode, status);
  }
}

function metaPlanFromPlanId(planId: string | null | undefined): string {
  if (planId === "PRO") return "pro";
  if (planId === "TEAM") return "team";
  return "free";
}

export async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;
  const tenantId = await resolveTenantFromSubscription(sub);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  await tenantSubscriptionService.updateSubscriptionStatus(sub.id, {
    status: "canceled",
    planCode: "free",
    stripeSubscriptionId: null,
    cancelAtPeriodEnd: false,
  });

  if (tenantId) {
    await BillingService.setUserPlan(tenantId, "FREE");
    await BillingProfileRepository.clearSubscriptionId(tenantId);
    trackSubscriptionCancelled({ userId: tenantId });
    trackSubscriptionCancelledPortal({ userId: tenantId });
  } else if (customerId) {
    const profile = await prisma.userBillingProfile.findFirst({ where: { stripeCustomerId: customerId } });
    if (profile) {
      await BillingService.setUserPlan(profile.userId, "FREE");
      await BillingProfileRepository.clearSubscriptionId(profile.userId);
      trackSubscriptionCancelled({ userId: profile.userId });
      trackSubscriptionCancelledPortal({ userId: profile.userId });
    }
  }
}

async function subscriptionIdFromInvoice(invoice: Stripe.Invoice): Promise<string | undefined> {
  const sub = invoice.subscription;
  if (typeof sub === "string") return sub;
  return sub?.id ?? undefined;
}

export async function handleInvoicePaid(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = await subscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const n = await tenantSubscriptionService.updateSubscriptionStatus(subscriptionId, { status: "active" });
  if (n > 0) {
    const row = await tenantSubscriptionService.findByStripeSubscriptionId(subscriptionId);
    if (row) await syncUserPlanFromTenant(row.tenantId, row.planCode, "active");
  }
}

export async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = await subscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const n = await tenantSubscriptionService.updateSubscriptionStatus(subscriptionId, { status: "past_due" });
  if (n > 0) {
    const row = await tenantSubscriptionService.findByStripeSubscriptionId(subscriptionId);
    if (row) await syncUserPlanFromTenant(row.tenantId, row.planCode, "past_due");
  }
}

export async function handleCustomerUpdated(event: Stripe.Event): Promise<void> {
  const customer = event.data.object as Stripe.Customer;
  trackCustomerUpdated({ stripeCustomerId: customer.id });
  console.info("[billing/webhook] Customer updated", {
    stripeCustomerId: customer.id,
    email: customer.email,
  });
}
