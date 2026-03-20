/**
 * Service de agregação para o dashboard admin de billing.
 */

import { prisma } from "@/lib/prisma";
import { getRevenueMetrics } from "@/modules/analytics";
import { getUsageUnitPricesBrl } from "../planConfig";
import { periodYYYYMM } from "../usageService";
import type {
  BillingDashboardSummary,
  BillingTenantRow,
  BillingCriticalEvent,
  BillingDashboardFilters,
  UsageByPlan,
  RevenueByType,
} from "./billingDashboardTypes";

const CRITICAL_EVENT_TYPES = [
  "invoice.payment_failed",
  "usage.limit_exceeded",
  "system.error",
  "usage.threshold_warning",
];

export async function getBillingDashboardSummary(): Promise<BillingDashboardSummary> {
  const period = periodYYYYMM();
  const revenue = await getRevenueMetrics();

  const [subscriptions, overageAgg, auditCounts] = await Promise.all([
    prisma.billingSubscription.findMany({
      select: {
        status: true,
        messagesOverageSent: true,
        aiOverageSent: true,
      },
    }),
    prisma.billingSubscription.aggregate({
      where: { plan: { not: "FREE" } },
      _sum: {
        messagesOverageSent: true,
        aiOverageSent: true,
      },
    }),
    prisma.billingAuditLog.groupBy({
      by: ["eventType"],
      where: {
        eventType: { in: CRITICAL_EVENT_TYPES },
        createdAt: { gte: new Date(period + "-01") },
      },
      _count: { id: true },
    }),
  ]);

  const pastDue = subscriptions.filter((s) => s.status === "past_due").length;
  const canceled = subscriptions.filter((s) => s.status === "canceled").length;

  const totalMsgOverage = overageAgg._sum.messagesOverageSent ?? 0;
  const totalAiOverage = overageAgg._sum.aiOverageSent ?? 0;
  const prices = getUsageUnitPricesBrl();
  const overageRevenue = totalMsgOverage * prices.message + totalAiOverage * prices.aiResponse;

  const failedInvoices =
    auditCounts.find((a) => a.eventType === "invoice.payment_failed")?._count.id ?? 0;
  const blockedUsage =
    auditCounts.find((a) => a.eventType === "usage.limit_exceeded")?._count.id ?? 0;

  return {
    totalMRR: revenue.mrr,
    totalARR: revenue.arr,
    activeSubscriptions: revenue.activeSubscriptions,
    pastDueSubscriptions: pastDue,
    canceledSubscriptions: canceled,
    totalMessageOverage: totalMsgOverage,
    totalAiOverage: totalAiOverage,
    totalOverageRevenue: Math.round(overageRevenue * 100) / 100,
    failedInvoicesCount: failedInvoices,
    blockedUsageEventsCount: blockedUsage,
  };
}

export async function getBillingTenants(
  filters: BillingDashboardFilters,
  sortBy: keyof BillingTenantRow = "updatedAt",
  sortOrder: "asc" | "desc" = "desc",
  limit = 50
): Promise<BillingTenantRow[]> {
  const period = periodYYYYMM();

  const where: { plan?: string; status?: string; tenantId?: string } = {};
  if (filters.plan) where.plan = filters.plan;
  if (filters.subscriptionStatus) where.status = filters.subscriptionStatus;
  if (filters.tenantId) where.tenantId = filters.tenantId;

  const subs = await prisma.billingSubscription.findMany({
    where,
    include: {
      tenant: { select: { id: true, name: true } },
    },
    take: limit * 2,
  });

  const tenantIds = subs.map((s) => s.tenantId);
  const usageMap = new Map<string, { messages: number; ai: number }>();
  if (tenantIds.length > 0) {
    const aggs = await prisma.usageAggregate.findMany({
      where: { tenantId: { in: tenantIds }, period },
    });
    for (const a of aggs) {
      usageMap.set(a.tenantId, {
        messages: a.messagesCount,
        ai: a.aiCount,
      });
    }
  }

  const { getTenantPlanCapabilities } = await import("../planCapabilities");
  const rows: BillingTenantRow[] = subs.map((sub) => {
    const caps = getTenantPlanCapabilities(sub.plan);
    const usage = usageMap.get(sub.tenantId) ?? { messages: 0, ai: 0 };
    return {
      tenantId: sub.tenantId,
      tenantName: sub.tenant.name,
      plan: sub.plan,
      subscriptionStatus: sub.status,
      messagesUsed: usage.messages,
      messagesLimit: caps.maxMessages,
      aiUsed: usage.ai,
      aiLimit: caps.maxAIUsage,
      overageMessages: sub.messagesOverageSent,
      overageAi: sub.aiOverageSent,
      lastInvoiceAmount: sub.lastInvoiceAmountPaid,
      lastInvoiceStatus: sub.lastInvoiceStatus,
      updatedAt: sub.updatedAt.toISOString(),
    };
  });

  const orderMultiplier = sortOrder === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    const av = a[sortBy];
    const bv = b[sortBy];
    if (typeof av === "string" && typeof bv === "string")
      return av.localeCompare(bv) * orderMultiplier;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * orderMultiplier;
    if (av == null && bv == null) return 0;
    if (av == null) return orderMultiplier;
    if (bv == null) return -orderMultiplier;
    return 0;
  });

  return rows.slice(0, limit);
}

export async function getBillingCriticalEvents(
  filters: BillingDashboardFilters,
  limit = 50
): Promise<BillingCriticalEvent[]> {
  const where: {
    eventType: { in: string[] } | string;
    tenantId?: string;
    createdAt?: { gte?: Date; lte?: Date };
  } = { eventType: filters.eventType ?? { in: CRITICAL_EVENT_TYPES } };
  if (filters.tenantId) where.tenantId = filters.tenantId;
  if (filters.dateFrom || filters.dateTo) {
    const range: { gte?: Date; lte?: Date } = {};
    if (filters.dateFrom) range.gte = new Date(filters.dateFrom);
    if (filters.dateTo) range.lte = new Date(filters.dateTo);
    where.createdAt = range;
  }

  const logs = await prisma.billingAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      tenant: { select: { name: true } },
    },
  });

  return logs.map((l) => ({
    id: l.id,
    tenantId: l.tenantId,
    tenantName: l.tenant.name,
    eventType: l.eventType,
    source: l.source,
    createdAt: l.createdAt.toISOString(),
    metadata: l.metadata as Record<string, unknown> | null,
  }));
}

export async function getUsageByPlan(): Promise<UsageByPlan[]> {
  const period = periodYYYYMM();

  const subs = await prisma.billingSubscription.findMany({
    where: { plan: { not: "FREE" } },
    select: { tenantId: true, plan: true },
  });
  const tenantIds = subs.map((s) => s.tenantId);
  const aggs =
    tenantIds.length > 0
      ? await prisma.usageAggregate.findMany({
          where: { period, tenantId: { in: tenantIds } },
        })
      : [];

  const usageByTenant = new Map(aggs.map((a) => [a.tenantId, { messages: a.messagesCount, ai: a.aiCount }]));
  const byPlan = new Map<string, { messages: number; ai: number }>([
    ["STARTER", { messages: 0, ai: 0 }],
    ["PRO", { messages: 0, ai: 0 }],
    ["SCALE", { messages: 0, ai: 0 }],
  ]);

  for (const sub of subs) {
    const plan = sub.plan.toUpperCase() === "TEAM" ? "SCALE" : sub.plan.toUpperCase();
    const cur = byPlan.get(plan) ?? { messages: 0, ai: 0 };
    const usage = usageByTenant.get(sub.tenantId) ?? { messages: 0, ai: 0 };
    cur.messages += usage.messages;
    cur.ai += usage.ai;
    byPlan.set(plan, cur);
  }

  return ["STARTER", "PRO", "SCALE"].map((plan) => ({
    plan,
    messages: byPlan.get(plan)?.messages ?? 0,
    ai: byPlan.get(plan)?.ai ?? 0,
  }));
}

export async function getRevenueByType(): Promise<RevenueByType[]> {
  const [revenue, overageAgg, prices] = await Promise.all([
    getRevenueMetrics(),
    prisma.billingSubscription.aggregate({
      where: { plan: { not: "FREE" }, status: { in: ["active", "trialing"] } },
      _sum: { messagesOverageSent: true, aiOverageSent: true },
    }),
    getUsageUnitPricesBrl(),
  ]);

  const msgOverage = overageAgg._sum.messagesOverageSent ?? 0;
  const aiOverage = overageAgg._sum.aiOverageSent ?? 0;

  return [
    { type: "recorrente", value: revenue.mrr },
    { type: "overage_mensagens", value: msgOverage * prices.message },
    { type: "overage_ia", value: aiOverage * prices.aiResponse },
  ];
}
