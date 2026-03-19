/**
 * Revenue analytics — MRR, ARR, ARPU, churn a partir de BillingSubscription + Tenant.
 * Fonte: Prisma (whatsapp_tenants, billing_subscriptions).
 */

import { prisma } from "@/lib/prisma";
import type { RevenueMetrics } from "./types";

const ACTIVE_STATUSES = ["active", "trialing"];
const CANCELED_STATUS = "canceled";

function getPlanPriceMonthlyBrl(plan: string): number {
  const key = plan.toUpperCase();
  if (key === "PRO") return Math.max(0, parseFloat(process.env.REVENUE_PLAN_PRICE_PRO_BRL ?? "29") || 29);
  if (key === "SCALE" || key === "TEAM") return Math.max(0, parseFloat(process.env.REVENUE_PLAN_PRICE_SCALE_BRL ?? "79") || 79);
  return 0;
}

/**
 * Calcula métricas de receita (MRR, ARR, ARPU, churn) com dados atuais.
 */
export async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const [subscriptions, totalTenants] = await Promise.all([
    prisma.billingSubscription.findMany({
      select: { plan: true, status: true },
    }),
    prisma.tenant.count(),
  ]);

  let mrr = 0;
  let activeCount = 0;
  let canceledCount = 0;

  for (const sub of subscriptions) {
    if (ACTIVE_STATUSES.includes(sub.status)) {
      activeCount++;
      mrr += getPlanPriceMonthlyBrl(sub.plan);
    } else if (sub.status === CANCELED_STATUS) {
      canceledCount++;
    }
  }

  const arr = mrr * 12;
  const baseForChurn = activeCount + canceledCount;
  const churnRate = baseForChurn === 0 ? 0 : Number(((canceledCount / baseForChurn) * 100).toFixed(2));
  const arpu = activeCount === 0 ? 0 : Number((mrr / activeCount).toFixed(2));

  return {
    mrr,
    arr,
    arpu,
    churnRate,
    activeSubscriptions: activeCount,
    canceledInPeriod: canceledCount,
    totalTenants,
  };
}
