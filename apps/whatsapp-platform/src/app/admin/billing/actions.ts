"use server";

import {
  getBillingDashboardSummary,
  getBillingTenants,
  getBillingCriticalEvents,
  getUsageByPlan,
  getRevenueByType,
} from "@/modules/billing/admin/billingDashboardService";
import type {
  BillingDashboardSummary,
  BillingTenantRow,
  BillingCriticalEvent,
  BillingDashboardFilters,
} from "@/modules/billing/admin/billingDashboardTypes";

export type BillingDashboardPayload = {
  summary: BillingDashboardSummary;
  tenants: BillingTenantRow[];
  criticalEvents: BillingCriticalEvent[];
  usageByPlan: Awaited<ReturnType<typeof getUsageByPlan>>;
  revenueByType: Awaited<ReturnType<typeof getRevenueByType>>;
};

export async function getBillingDashboard(
  filters: BillingDashboardFilters = {},
  sortBy: keyof BillingTenantRow = "updatedAt",
  sortOrder: "asc" | "desc" = "desc"
): Promise<BillingDashboardPayload> {
  const [summary, tenants, criticalEvents, usageByPlan, revenueByType] =
    await Promise.all([
      getBillingDashboardSummary(),
      getBillingTenants(filters, sortBy, sortOrder, 50),
      getBillingCriticalEvents(filters, 50),
      getUsageByPlan(),
      getRevenueByType(),
    ]);

  return {
    summary,
    tenants,
    criticalEvents,
    usageByPlan,
    revenueByType,
  };
}
