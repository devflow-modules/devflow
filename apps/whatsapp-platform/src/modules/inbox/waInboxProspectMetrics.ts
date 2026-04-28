import { Prisma } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";

export type InboxProspectMetricsRow = {
  totalOpen: number;
  followupDue: number;
  proposalOpen: number;
  diagnosisScheduled: number;
  hotLead: number;
  pendingInbound: number;
};

/**
 * Contagens leves para barra de prospecção (threads não fechadas).
 */
export async function waInboxProspectMetrics(tenantId: string): Promise<InboxProspectMetricsRow> {
  const rows = await prisma.$queryRaw<
    {
      total_open: bigint;
      followup_due: bigint;
      proposal_open: bigint;
      diagnosis_scheduled: bigint;
      hot_lead: bigint;
      pending_inbound: bigint;
    }[]
  >(Prisma.sql`
    SELECT
      COUNT(*)::bigint AS total_open,
      COUNT(*) FILTER (
        WHERE t.lead_data IS NOT NULL
          AND NULLIF(btrim(t.lead_data::jsonb #>> '{prospect,nextFollowUpAt}'), '') IS NOT NULL
          AND (t.lead_data::jsonb #>> '{prospect,nextFollowUpAt}') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
          AND (t.lead_data::jsonb #>> '{prospect,nextFollowUpAt}')::timestamptz
            <= (date_trunc('day', now()) + interval '1 day' - interval '1 second')
      )::bigint AS followup_due,
      COUNT(*) FILTER (
        WHERE t.lead_data::jsonb->'prospect'->>'salesStage' = 'PROPOSAL_SENT'
      )::bigint AS proposal_open,
      COUNT(*) FILTER (
        WHERE t.lead_data::jsonb->'prospect'->>'salesStage' = 'DIAGNOSIS_SCHEDULED'
      )::bigint AS diagnosis_scheduled,
      COUNT(*) FILTER (WHERE t.lead_score >= 40)::bigint AS hot_lead,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM wa_inbox_messages mi
          WHERE mi.thread_id = t.id AND mi.tenant_id = t.tenant_id AND mi.direction = 'INBOUND'
            AND mi.ts > COALESCE(
              (SELECT MAX(mo.ts) FROM wa_inbox_messages mo
               WHERE mo.thread_id = t.id AND mo.tenant_id = t.tenant_id AND mo.direction = 'OUTBOUND'),
              'epoch'::timestamp
            )
        )
      )::bigint AS pending_inbound
    FROM wa_inbox_threads t
    WHERE t.tenant_id = ${tenantId} AND t.status::text <> 'CLOSED'
  `);

  const r = rows[0];
  const n = (x: bigint | undefined) => Number(x ?? 0);
  return {
    totalOpen: n(r?.total_open),
    followupDue: n(r?.followup_due),
    proposalOpen: n(r?.proposal_open),
    diagnosisScheduled: n(r?.diagnosis_scheduled),
    hotLead: n(r?.hot_lead),
    pendingInbound: n(r?.pending_inbound),
  };
}
