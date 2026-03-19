/**
 * Uso agregado por período e ranking de tenants (mensagens vs IA).
 * Fonte: UsageEvent + UsageAggregate (Prisma).
 */

import { UsageEventType } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";
import type { DateRange, UsageAggregateRow, UsageMetrics, TenantRankingRow } from "./types";

export function toDateRange(period: "7d" | "30d", now = new Date()): DateRange {
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  if (period === "7d") from.setDate(from.getDate() - 6);
  else from.setDate(from.getDate() - 29);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

/**
 * Métricas de uso no intervalo: totais e por mês (byPeriod).
 */
export async function getUsageMetrics(range: DateRange): Promise<UsageMetrics> {
  const [messageSum, aiSum, byMonth] = await Promise.all([
    prisma.usageEvent.aggregate({
      where: {
        type: UsageEventType.MESSAGE_SENT,
        createdAt: { gte: range.from, lte: range.to },
      },
      _sum: { quantity: true },
    }),
    prisma.usageEvent.aggregate({
      where: {
        type: UsageEventType.AI_RESPONSE,
        createdAt: { gte: range.from, lte: range.to },
      },
      _sum: { quantity: true },
    }),
    getUsageByMonthInRange(range),
  ]);

  return {
    totalMessages: messageSum._sum.quantity ?? 0,
    totalAi: aiSum._sum.quantity ?? 0,
    byPeriod: byMonth,
  };
}

/** Agrupa uso por mês (YYYY-MM) dentro do range. */
async function getUsageByMonthInRange(range: DateRange): Promise<UsageAggregateRow[]> {
  const periods = listMonthsInRange(range.from, range.to);
  if (periods.length === 0) return [];

  const aggs = await prisma.usageAggregate.findMany({
    where: { period: { in: periods } },
  });

  const byPeriod = new Map<string, { messagesCount: number; aiCount: number }>();
  for (const p of periods) {
    byPeriod.set(p, { messagesCount: 0, aiCount: 0 });
  }
  for (const a of aggs) {
    const cur = byPeriod.get(a.period) ?? { messagesCount: 0, aiCount: 0 };
    cur.messagesCount += a.messagesCount;
    cur.aiCount += a.aiCount;
    byPeriod.set(a.period, cur);
  }

  return periods.map((period) => {
    const cur = byPeriod.get(period) ?? { messagesCount: 0, aiCount: 0 };
    return { period, ...cur };
  });
}

function listMonthsInRange(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    out.push(`${y}-${m}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

/**
 * Top tenants por uso (mensagens + IA) no período.
 */
export async function getTopTenantsByUsage(
  range: DateRange,
  limit: number
): Promise<TenantRankingRow[]> {
  const raw = await prisma.usageEvent.groupBy({
    by: ["tenantId"],
    where: { createdAt: { gte: range.from, lte: range.to } },
    _sum: { quantity: true },
    _count: { id: true },
  });

  const byType = await Promise.all([
    prisma.usageEvent.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: raw.map((r) => r.tenantId) },
        type: UsageEventType.MESSAGE_SENT,
        createdAt: { gte: range.from, lte: range.to },
      },
      _sum: { quantity: true },
    }),
    prisma.usageEvent.groupBy({
      by: ["tenantId"],
      where: {
        tenantId: { in: raw.map((r) => r.tenantId) },
        type: UsageEventType.AI_RESPONSE,
        createdAt: { gte: range.from, lte: range.to },
      },
      _sum: { quantity: true },
    }),
  ]);

  const msgByTenant = new Map(byType[0].map((r) => [r.tenantId, r._sum.quantity ?? 0]));
  const aiByTenant = new Map(byType[1].map((r) => [r.tenantId, r._sum.quantity ?? 0]));

  const tenantIds = raw.map((r) => r.tenantId);
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, name: true, plan: true },
  });
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));

  const rows: TenantRankingRow[] = raw.map((r) => {
    const messagesCount = msgByTenant.get(r.tenantId) ?? 0;
    const aiCount = aiByTenant.get(r.tenantId) ?? 0;
    const t = tenantMap.get(r.tenantId);
    return {
      tenantId: r.tenantId,
      tenantName: t?.name ?? null,
      plan: t?.plan ?? null,
      messagesCount,
      aiCount,
      totalUsage: messagesCount + aiCount,
    };
  });

  rows.sort((a, b) => b.totalUsage - a.totalUsage);
  return rows.slice(0, limit);
}
