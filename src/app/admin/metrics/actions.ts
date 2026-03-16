"use server";

import { getCounters as getFinanceCounters } from "@/modules/financeiro/adapters/metrics/financeMetrics";
import { getCounters as getGrowthCounters } from "@/analytics/growth/growthMetrics";
import { getRevenueMetrics } from "@/modules/revenue";
import type { RevenueMetrics } from "@/modules/revenue";

export type MetricsPayload = {
  finance: { metrics: Record<string, number> };
  growth: { metrics: Record<string, number> };
  revenue: RevenueMetrics;
};

export async function getMetrics(): Promise<MetricsPayload> {
  const [revenue] = await Promise.all([getRevenueMetrics()]);

  return {
    finance: { metrics: getFinanceCounters() },
    growth: { metrics: getGrowthCounters() },
    revenue,
  };
}
