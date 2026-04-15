/**
 * Resumo operacional do billing — dashboard interno.
 */

import { prisma } from "@/lib/prisma";
import { getUsageByPeriod, periodYYYYMM } from "./usageService";
import { getTenantPlanCapabilities } from "./planCapabilities";
import { getStripe, isStripeConfigured } from "@/modules/stripe/stripeClient";

export type TenantBillingSummary = {
  plan: string;
  status: string;
  hasStripeCustomer: boolean;
  usage: { messages: number; ai: number };
  limits: { messages: number | null; ai: number | null };
  overage: { messages: number; ai: number };
  lastInvoice: {
    id: string | null;
    status: string | null;
    amountPaid: number | null;
  } | null;
  nextInvoice: {
    amountDue: number | null;
    periodEnd: string | null;
  } | null;
};

/**
 * Retorna resumo completo do billing do tenant para dashboard/operacional.
 */
export async function getTenantBillingSummary(
  tenantId: string
): Promise<TenantBillingSummary> {
  const period = periodYYYYMM();

  const [tenantSub, billingSub, tenant, usage] = await Promise.all([
    prisma.tenantSubscription.findUnique({
      where: { tenantId },
      select: { plan: true, status: true, stripeCustomerId: true },
    }),
    prisma.billingSubscription.findUnique({
      where: { tenantId },
      select: {
        plan: true,
        status: true,
        lastInvoiceId: true,
        lastInvoiceStatus: true,
        lastInvoiceAmountPaid: true,
        currentPeriodEnd: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        messagesIncludedUsed: true,
        aiIncludedUsed: true,
        messagesOverageSent: true,
        aiOverageSent: true,
      },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, stripeCustomerId: true },
    }),
    getUsageByPeriod(tenantId, period),
  ]);

  const plan =
    tenantSub?.plan ?? billingSub?.plan ?? tenant?.plan ?? "FREE";
  const status =
    tenantSub?.status ?? billingSub?.status ?? (tenant?.stripeCustomerId ? "active" : "free");

  const hasStripeCustomer = !!(
    tenantSub?.stripeCustomerId ??
    billingSub?.stripeCustomerId ??
    tenant?.stripeCustomerId
  );

  const caps = getTenantPlanCapabilities(plan);

  let nextInvoice: TenantBillingSummary["nextInvoice"] = null;
  if (billingSub?.stripeSubscriptionId && isStripeConfigured()) {
    try {
      const stripe = getStripe();
      const upcoming = await stripe.invoices.retrieveUpcoming({
        subscription: billingSub.stripeSubscriptionId,
      });
      nextInvoice = {
        amountDue: upcoming.amount_due ?? null,
        periodEnd: upcoming.period_end
          ? new Date(upcoming.period_end * 1000).toISOString()
          : null,
      };
    } catch {
      nextInvoice = {
        amountDue: null,
        periodEnd: billingSub.currentPeriodEnd?.toISOString() ?? null,
      };
    }
  } else if (billingSub?.currentPeriodEnd) {
    nextInvoice = {
      amountDue: null,
      periodEnd: billingSub.currentPeriodEnd.toISOString(),
    };
  }

  return {
    plan,
    status,
    hasStripeCustomer,
    usage: {
      messages: usage.messagesSent,
      ai: usage.aiResponses,
    },
    limits: {
      messages: caps.maxMessages,
      ai: caps.maxAIUsage,
    },
    overage: {
      messages: billingSub?.messagesOverageSent ?? 0,
      ai: billingSub?.aiOverageSent ?? 0,
    },
    lastInvoice: billingSub?.lastInvoiceId
      ? {
          id: billingSub.lastInvoiceId,
          status: billingSub.lastInvoiceStatus,
          amountPaid: billingSub.lastInvoiceAmountPaid,
        }
      : null,
    nextInvoice,
  };
}
