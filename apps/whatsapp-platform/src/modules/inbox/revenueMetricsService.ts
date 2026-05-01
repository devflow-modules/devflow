import { prisma } from "@/lib/prisma";

export type TenantRevenueMetrics = {
  totalRevenue: number;
  dealsWon: number;
  conversionRate: number;
  avgTicket: number;
  activeThreads: number;
  days: number;
};

/**
 * Métricas de receita declarada em threads (`deal_status = won`) no período.
 *
 * **Conversão (MVP):** `conversionRate` = vendas ganhas ÷ threads com `last_message_at` no período.
 * Thread ≠ oportunidade comercial sempre — é um proxy mensurável. Evolução natural: lead →
 * opportunity → deal com denominador/numerador alinhados a oportunidades.
 */
export async function getTenantRevenueMetrics(
  tenantId: string,
  days: number
): Promise<TenantRevenueMetrics> {
  const d = Math.min(Math.max(Math.floor(days), 1), 365);
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - d);

  const [agg, activeCount] = await Promise.all([
    prisma.waInboxThread.aggregate({
      where: {
        tenantId,
        dealStatus: "won",
        dealClosedAt: { gte: since },
      },
      _sum: { dealValue: true },
      _count: { _all: true },
    }),
    prisma.waInboxThread.count({
      where: {
        tenantId,
        lastMessageAt: { gte: since },
      },
    }),
  ]);

  const dealsWon = agg._count._all;
  const totalRevenue = Number(agg._sum.dealValue ?? 0);
  const avgTicket = dealsWon > 0 ? totalRevenue / dealsWon : 0;
  const conversionRate = activeCount > 0 ? dealsWon / activeCount : 0;

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    dealsWon,
    conversionRate: Math.round(conversionRate * 10000) / 10000,
    avgTicket: Math.round(avgTicket * 100) / 100,
    activeThreads: activeCount,
    days: d,
  };
}
