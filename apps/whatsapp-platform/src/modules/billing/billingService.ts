import { createCheckoutSession, createCustomerPortalSession } from "@devflow/billing-core";
import type { PlanIdPaid } from "@devflow/billing-core";
import { prisma } from "@/lib/prisma";
import { getUsageByPeriod, getStripeUsageSyncStats, periodYYYYMM } from "./usageService";
import { isMeteredBillingConfigured } from "./stripeMeteredService";
import { getPlanLimits, getUsageUnitPricesBrl, normalizePlanKey } from "./planConfig";

export type CheckoutPlan = "PRO" | "SCALE";

function checkoutPlanToStripePrice(plan: CheckoutPlan): PlanIdPaid {
  return plan === "SCALE" ? "TEAM" : "PRO";
}

export async function createBillingCheckoutSession(
  tenantId: string,
  email: string,
  plan: CheckoutPlan,
  baseUrl: string
): Promise<{ checkoutUrl: string }> {
  const stripePlan = checkoutPlanToStripePrice(plan);
  const result = await createCheckoutSession({
    userId: tenantId,
    email,
    planId: stripePlan,
    successUrl: `${baseUrl.replace(/\/$/, "")}/settings/billing?checkout=success`,
    cancelUrl: `${baseUrl.replace(/\/$/, "")}/settings/billing?checkout=cancel`,
  });
  return { checkoutUrl: result.checkoutUrl };
}

export async function createBillingPortalSession(
  tenantId: string,
  returnUrl: string
): Promise<{ portalUrl: string }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { stripeCustomerId: true },
  });
  const cid = tenant?.stripeCustomerId;
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
  const [tenant, sub] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, stripeCustomerId: true, activeUntil: true },
    }),
    prisma.billingSubscription.findUnique({ where: { tenantId } }),
  ]);

  const plan = sub?.plan ?? normalizePlanKey(tenant?.plan);
  const status = sub?.status ?? (tenant?.stripeCustomerId ? "active" : "free");

  return {
    plan,
    status,
    stripeCustomerId: sub?.stripeCustomerId ?? tenant?.stripeCustomerId ?? null,
    stripeSubscriptionId: sub?.stripeSubscriptionId ?? null,
    currentPeriodStart: sub?.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
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
  const usage = await getUsageByPeriod(tenantId, p);
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  const planKey = normalizePlanKey(tenant?.plan);
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
