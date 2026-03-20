/**
 * Serviço de dados para a UX de billing do usuário final.
 * Retorna payload otimizado para exibição na página /dashboard/billing.
 */

import { getTenantBillingSummary } from "./billingSummaryService";
import { getUsageUnitPricesBrl } from "./planConfig";

export type TenantBillingUI = {
  plan: string;
  status: string;
  hasStripeCustomer: boolean;
  messagesUsed: number;
  messagesLimit: number | null;
  aiUsed: number;
  aiLimit: number | null;
  usagePercentageMessages: number | null;
  usagePercentageAI: number | null;
  overageMessages: number;
  overageAI: number;
  estimatedOverageCost: number;
  nextInvoiceDate: string | null;
  lastInvoiceAmount: number | null;
  lastInvoiceStatus: string | null;
  enforceLimits: boolean;
};

/**
 * Retorna dados formatados para a UI de billing do tenant.
 */
export async function getTenantBillingUI(tenantId: string): Promise<TenantBillingUI> {
  const summary = await getTenantBillingSummary(tenantId);
  const prices = getUsageUnitPricesBrl();

  const messagesLimit = summary.limits.messages;
  const aiLimit = summary.limits.ai;

  const usagePercentageMessages =
    messagesLimit != null && messagesLimit > 0
      ? Math.round((summary.usage.messages / messagesLimit) * 100)
      : null;

  const usagePercentageAI =
    aiLimit != null && aiLimit > 0
      ? Math.round((summary.usage.ai / aiLimit) * 100)
      : null;

  const estimatedOverageCost =
    summary.overage.messages * prices.message + summary.overage.ai * prices.aiResponse;

  return {
    plan: summary.plan,
    status: summary.status,
    hasStripeCustomer: summary.hasStripeCustomer,
    messagesUsed: summary.usage.messages,
    messagesLimit,
    aiUsed: summary.usage.ai,
    aiLimit,
    usagePercentageMessages,
    usagePercentageAI,
    overageMessages: summary.overage.messages,
    overageAI: summary.overage.ai,
    estimatedOverageCost,
    nextInvoiceDate: summary.nextInvoice?.periodEnd ?? null,
    lastInvoiceAmount: summary.lastInvoice?.amountPaid ?? null,
    lastInvoiceStatus: summary.lastInvoice?.status ?? null,
    enforceLimits: process.env.BILLING_ENFORCE_LIMITS !== "false",
  };
}
