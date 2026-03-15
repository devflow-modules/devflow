"use server";

import { getCounters as getFinanceCounters } from "@/modules/financeiro/adapters/metrics/financeMetrics";
import { getCounters as getGrowthCounters } from "@/analytics/growth/growthMetrics";

export type MetricsPayload = {
  finance: { metrics: Record<string, number> };
  growth: { metrics: Record<string, number> };
};

export async function getMetrics(): Promise<MetricsPayload> {
  return {
    finance: { metrics: getFinanceCounters() },
    growth: { metrics: getGrowthCounters() },
  };
}
