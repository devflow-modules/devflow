"use server";

import { getCounters } from "@devflow/analytics-core";
import {
  countInboxThreadsTotal,
  countTenantsTotal,
} from "@/modules/inbox/waInboxOpsMetrics";
import { countMessagesLast24h } from "@/modules/messaging/waInboxMessageStats";
import {
  getRevenueMetrics,
  getUsageMetrics,
  getTopTenantsByUsage,
  toDateRange,
} from "@/modules/analytics";
import type { RevenueMetrics, UsageMetrics, TenantRankingRow } from "@/modules/analytics";

export type AdminMetricsPayload = {
  whatsapp_platform: { metrics: Record<string, number> };
  ops: { tenants: number; conversations: number; messagesLast24h: number };
};

export type AdminRevenuePayload = RevenueMetrics;
export type AdminUsagePayload = UsageMetrics & { from: string; to: string };
export type AdminTenantsPayload = { from: string; to: string; tenants: TenantRankingRow[] };

export async function getAdminMetrics(): Promise<AdminMetricsPayload> {
  const metrics = getCounters();
  let tenants = 0;
  let conversations = 0;
  let messagesLast24h = 0;
  try {
    [tenants, conversations, messagesLast24h] = await Promise.all([
      countTenantsTotal(),
      countInboxThreadsTotal(),
      countMessagesLast24h(),
    ]);
  } catch (err) {
    console.error("[admin/metrics]", err);
  }

  return {
    whatsapp_platform: { metrics },
    ops: { tenants, conversations, messagesLast24h },
  };
}

export async function getAdminRevenue(): Promise<AdminRevenuePayload> {
  return getRevenueMetrics();
}

export async function getAdminUsage(period: "7d" | "30d"): Promise<AdminUsagePayload> {
  const range = toDateRange(period);
  const metrics = await getUsageMetrics(range);
  return {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    ...metrics,
  };
}

export async function getAdminTenants(
  period: "7d" | "30d",
  limit = 10
): Promise<AdminTenantsPayload> {
  const range = toDateRange(period);
  const tenants = await getTopTenantsByUsage(range, limit);
  return {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    tenants,
  };
}
