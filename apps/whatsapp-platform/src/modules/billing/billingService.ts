import { createCustomerPortalSession } from "@devflow/billing-core";
import { prisma } from "@/lib/prisma";
import { createCheckoutSession as createStripeCheckout, isStripeConfigured } from "@/modules/stripe";
import { getUsageByPeriod, getStripeUsageSyncStats, periodYYYYMM } from "./usageService";
import { isMeteredBillingConfigured } from "./stripeMeteredService";
import { getPlanLimits, getUsageUnitPricesBrl, normalizePlanKey } from "./planConfig";
import { getTenantPlan } from "./subscriptionService";

export type CheckoutPlan = "PRO" | "SCALE";

export async function createBillingCheckoutSession(
  tenantId: string,
  email: string,
  plan: CheckoutPlan,
  baseUrl: string
): Promise<{ checkoutUrl: string }> {
  if (isStripeConfigured()) {
    const [tenantSub, billingSub, tenant] = await Promise.all([
      prisma.tenantSubscription.findUnique({
        where: { tenantId },
        select: { stripeCustomerId: true },
      }),
      prisma.billingSubscription.findUnique({
        where: { tenantId },
        select: { stripeCustomerId: true },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { stripeCustomerId: true },
      }),
    ]);
    const stripeCustomerId =
      tenantSub?.stripeCustomerId ?? billingSub?.stripeCustomerId ?? tenant?.stripeCustomerId ?? null;
    const result = await createStripeCheckout({
      tenantId,
      email,
      plan,
      successUrl: `${baseUrl.replace(/\/$/, "")}/billing?success=true`,
      cancelUrl: `${baseUrl.replace(/\/$/, "")}/billing?canceled=true`,
      stripeCustomerId,
    });
    return { checkoutUrl: result.checkoutUrl };
  }
  const { createCheckoutSession } = await import("@devflow/billing-core");
  const result = await createCheckoutSession({
    userId: tenantId,
    email,
    planId: plan === "SCALE" ? "TEAM" : "PRO",
    successUrl: `${baseUrl.replace(/\/$/, "")}/settings/billing?checkout=success`,
    cancelUrl: `${baseUrl.replace(/\/$/, "")}/settings/billing?checkout=cancel`,
  });
  return { checkoutUrl: result.checkoutUrl };
}

export async function createBillingPortalSession(
  tenantId: string,
  returnUrl: string
): Promise<{ portalUrl: string }> {
  const [tenantSub, billingSub, tenant] = await Promise.all([
    prisma.tenantSubscription.findUnique({
      where: { tenantId },
      select: { stripeCustomerId: true },
    }),
    prisma.billingSubscription.findUnique({
      where: { tenantId },
      select: { stripeCustomerId: true },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { stripeCustomerId: true },
    }),
  ]);
  const cid =
    tenantSub?.stripeCustomerId ?? billingSub?.stripeCustomerId ?? tenant?.stripeCustomerId;
  if (!cid) {
    throw new Error("Cliente Stripe não encontrado. Faça upgrade primeiro.");
  }
  const result = await createCustomerPortalSession({
    stripeCustomerId: cid,
    returnUrl: returnUrl.replace(/\/$/, ""),
  });
  return { portalUrl: result.portalUrl };
}

export interface SubscriptionView {
  plan: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  activeUntil: string | null;
  meteredBillingConfigured: boolean;
  lastInvoiceId: string | null;
  lastInvoiceStatus: string | null;
  lastInvoiceAmountPaid: number | null;
}

export async function getSubscriptionView(tenantId: string): Promise<SubscriptionView> {
  const [tenantSub, tenant, sub] = await Promise.all([
    prisma.tenantSubscription.findUnique({ where: { tenantId } }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, stripeCustomerId: true, activeUntil: true },
    }),
    prisma.billingSubscription.findUnique({ where: { tenantId } }),
  ]);

  const plan =
    tenantSub?.plan ?? sub?.plan ?? normalizePlanKey(tenant?.plan);
  const status =
    tenantSub?.status ?? sub?.status ?? (tenant?.stripeCustomerId ? "active" : "free");

  return {
    plan,
    status,
    stripeCustomerId:
      tenantSub?.stripeCustomerId ??
      sub?.stripeCustomerId ??
      tenant?.stripeCustomerId ??
      null,
    stripeSubscriptionId:
      tenantSub?.stripeSubscriptionId ?? sub?.stripeSubscriptionId ?? null,
    currentPeriodStart:
      tenantSub?.currentPeriodStart?.toISOString() ??
      sub?.currentPeriodStart?.toISOString() ??
      null,
    currentPeriodEnd:
      tenantSub?.currentPeriodEnd?.toISOString() ??
      sub?.currentPeriodEnd?.toISOString() ??
      null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    activeUntil: tenant?.activeUntil?.toISOString() ?? null,
    meteredBillingConfigured: isMeteredBillingConfigured(),
    lastInvoiceId: sub?.lastInvoiceId ?? null,
    lastInvoiceStatus: sub?.lastInvoiceStatus ?? null,
    lastInvoiceAmountPaid: sub?.lastInvoiceAmountPaid ?? null,
  };
}

export interface UsageDashboard {
  period: string;
  messagesSent: number;
  aiResponses: number;
  limits: { messagesPerMonth: number | null; aiResponsesPerMonth: number | null };
  unitPricesBrl: { message: number; aiResponse: number };
  estimatedVariableCostBrl: number;
  withinLimits: { messages: boolean; ai: boolean };
  stripeMetered?: {
    messagesReportedToStripe: number;
    aiReportedToStripe: number;
    pendingStripeReports: number;
  };
}

export async function getUsageDashboard(tenantId: string, period?: string): Promise<UsageDashboard> {
  const p = period ?? periodYYYYMM();
  const [usage, planKey] = await Promise.all([
    getUsageByPeriod(tenantId, p),
    getTenantPlan(tenantId),
  ]);
  const limits = getPlanLimits(planKey);
  const prices = getUsageUnitPricesBrl();
  const estimated =
    usage.messagesSent * prices.message + usage.aiResponses * prices.aiResponse;

  const stripeSync = isMeteredBillingConfigured()
    ? await getStripeUsageSyncStats(tenantId, p)
    : null;

  return {
    period: p,
    messagesSent: usage.messagesSent,
    aiResponses: usage.aiResponses,
    limits: {
      messagesPerMonth: limits.messagesPerMonth,
      aiResponsesPerMonth: limits.aiResponsesPerMonth,
    },
    unitPricesBrl: prices,
    estimatedVariableCostBrl: Math.round(estimated * 10000) / 10000,
    withinLimits: {
      messages:
        limits.messagesPerMonth == null || usage.messagesSent <= limits.messagesPerMonth,
      ai: limits.aiResponsesPerMonth == null || usage.aiResponses <= limits.aiResponsesPerMonth,
    },
    ...(stripeSync
      ? {
          stripeMetered: {
            messagesReportedToStripe: stripeSync.messagesReported,
            aiReportedToStripe: stripeSync.aiReported,
            pendingStripeReports: stripeSync.pendingCount,
          },
        }
      : {}),
  };
}
