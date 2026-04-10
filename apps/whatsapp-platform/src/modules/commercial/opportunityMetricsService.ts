import { Prisma } from "@/generated/prisma-whatsapp";
import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";
import { COMMERCIAL_TASK_TYPES } from "./commercialAutomationConstants";

export type OpportunityMetrics = {
  highPending: number;
  stalled: number;
  negotiating: number;
  reactivationQueued: number;
};

function sqlUnansweredExists(tenantId: string): Prisma.Sql {
  return Prisma.sql`EXISTS (
    SELECT 1 FROM wa_inbox_messages mi
    WHERE mi.thread_id = t.id AND mi.tenant_id = ${tenantId}
      AND mi.direction = 'INBOUND'
      AND mi.ts > COALESCE(
        (SELECT MAX(mo.ts) FROM wa_inbox_messages mo
         WHERE mo.thread_id = t.id AND mo.tenant_id = ${tenantId} AND mo.direction = 'OUTBOUND'),
        'epoch'::timestamp
      )
  )`;
}

/**
 * Métricas comerciais para o dashboard (threads abertas / pendentes).
 */
export async function getOpportunityMetrics(tenantId: string): Promise<OpportunityMetrics> {
  const stalledCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const [highRows, stalledRows, negRows, reactivationRows] = await Promise.all([
    prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c FROM wa_inbox_threads t
      WHERE t.tenant_id = ${tenantId}
        AND t.status::text = 'OPEN'
        AND t.priority = 'HIGH'
        AND t.assigned_to_user_id IS NULL
        AND ${sqlUnansweredExists(tenantId)}
    `,
    prisma.waInboxThread.count({
      where: {
        tenantId,
        status: WaInboxThreadStatus.OPEN,
        assignedToUserId: null,
        lastMessageAt: { lt: stalledCutoff },
        aiState: { in: ["qualifying", "negotiating"] },
      },
    }),
    prisma.waInboxThread.count({
      where: {
        tenantId,
        status: { in: [WaInboxThreadStatus.OPEN, WaInboxThreadStatus.PENDING] },
        aiState: "negotiating",
      },
    }),
    prisma.followUpTask.count({
      where: {
        tenantId,
        executed: false,
        type: COMMERCIAL_TASK_TYPES.REACTIVATION,
      },
    }),
  ]);

  const highPending = Number(highRows[0]?.c ?? BigInt(0));

  return {
    highPending,
    stalled: stalledRows,
    negotiating: negRows,
    reactivationQueued: reactivationRows,
  };
}
