import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";

export type LeadQualityMetrics = {
  high: number;
  medium: number;
  low: number;
  avgScore: number;
};

/**
 * Métricas agregadas por prioridade CRM (threads abertas ou pendentes).
 */
export async function getLeadQualityMetrics(tenantId: string): Promise<LeadQualityMetrics> {
  const [grouped, avgRow] = await Promise.all([
    prisma.waInboxThread.groupBy({
      by: ["priority"],
      where: {
        tenantId,
        status: { in: [WaInboxThreadStatus.OPEN, WaInboxThreadStatus.PENDING] },
      },
      _count: { _all: true },
    }),
    prisma.waInboxThread.aggregate({
      where: {
        tenantId,
        status: { in: [WaInboxThreadStatus.OPEN, WaInboxThreadStatus.PENDING] },
      },
      _avg: { leadScore: true },
    }),
  ]);

  let high = 0;
  let medium = 0;
  let low = 0;
  for (const r of grouped) {
    if (r.priority === "HIGH") high = r._count._all;
    else if (r.priority === "MEDIUM") medium = r._count._all;
    else if (r.priority === "LOW") low = r._count._all;
  }

  const avg = avgRow._avg.leadScore;
  const avgScore = avg != null ? Math.round(avg * 10) / 10 : 0;

  return { high, medium, low, avgScore };
}
