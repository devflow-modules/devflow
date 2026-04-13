/**
 * Métricas operacionais da inbox (tenant-scoped).
 * Tempos baseados em auditoria `assign` quando existir; caso contrário médias podem ser null.
 */

import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";

export type InboxAgentLoad = {
  userId: string;
  name: string | null;
  openThreads: number;
};

export type InboxOperationalMetrics = {
  periodDays: number;
  /** Threads OPEN/PENDING por responsável */
  conversationsByAgent: InboxAgentLoad[];
  /** Média (s) entre criação da thread e primeira entrada de auditoria `assign` (amostras com assign) */
  avgQueueWaitSeconds: number | null;
  /** Média (s) entre primeira `assign` e fecho da thread (threads fechadas no período) */
  avgHandleSeconds: number | null;
  sampleQueue: number;
  sampleHandle: number;
};

export async function getInboxOperationalMetrics(
  tenantId: string,
  opts?: { periodDays?: number }
): Promise<InboxOperationalMetrics> {
  const periodDays = Math.min(Math.max(opts?.periodDays ?? 30, 1), 365);

  const since = new Date();
  since.setDate(since.getDate() - periodDays);

  const grouped = await prisma.waInboxThread.groupBy({
    by: ["assignedToUserId"],
    where: {
      tenantId,
      status: { in: [WaInboxThreadStatus.OPEN, WaInboxThreadStatus.PENDING] },
      assignedToUserId: { not: null },
    },
    _count: { _all: true },
  });

  const userIds = grouped.map((g) => g.assignedToUserId).filter(Boolean) as string[];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { tenantId, id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  const conversationsByAgent: InboxAgentLoad[] = grouped
    .filter((g) => g.assignedToUserId)
    .map((g) => ({
      userId: g.assignedToUserId!,
      name: nameById.get(g.assignedToUserId!) ?? null,
      openThreads: g._count._all,
    }))
    .sort((a, b) => b.openThreads - a.openThreads);

  const avgQueueRows = await prisma.$queryRaw<{ avg_sec: number | null; n: bigint }[]>`
    WITH first_assign AS (
      SELECT DISTINCT ON (al.thread_id)
        al.thread_id AS thread_id,
        al.created_at AS first_assign_at
      FROM wa_inbox_audit_logs al
      WHERE al.tenant_id = ${tenantId}
        AND al.action = 'assign'
      ORDER BY al.thread_id, al.created_at ASC
    )
    SELECT
      AVG(EXTRACT(EPOCH FROM (fa.first_assign_at - t.created_at)))::double precision AS avg_sec,
      COUNT(*)::bigint AS n
    FROM wa_inbox_threads t
    INNER JOIN first_assign fa ON fa.thread_id = t.id
    WHERE t.tenant_id = ${tenantId}
      AND fa.first_assign_at > t.created_at
  `;

  const avgHandleRows = await prisma.$queryRaw<{ avg_sec: number | null; n: bigint }[]>`
    WITH first_assign AS (
      SELECT DISTINCT ON (al.thread_id)
        al.thread_id AS thread_id,
        al.created_at AS first_assign_at
      FROM wa_inbox_audit_logs al
      WHERE al.tenant_id = ${tenantId}
        AND al.action = 'assign'
      ORDER BY al.thread_id, al.created_at ASC
    )
    SELECT
      AVG(EXTRACT(EPOCH FROM (t.updated_at - fa.first_assign_at)))::double precision AS avg_sec,
      COUNT(*)::bigint AS n
    FROM wa_inbox_threads t
    INNER JOIN first_assign fa ON fa.thread_id = t.id
    WHERE t.tenant_id = ${tenantId}
      AND t.status = 'CLOSED'
      AND t.updated_at >= ${since}
      AND t.updated_at > fa.first_assign_at
  `;

  const q = avgQueueRows[0];
  const h = avgHandleRows[0];

  return {
    periodDays,
    conversationsByAgent,
    avgQueueWaitSeconds: q?.avg_sec != null ? Math.round(q.avg_sec) : null,
    avgHandleSeconds: h?.avg_sec != null ? Math.round(h.avg_sec) : null,
    sampleQueue: Number(q?.n ?? 0),
    sampleHandle: Number(h?.n ?? 0),
  };
}
