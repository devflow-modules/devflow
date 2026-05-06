import { Prisma } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";
import { SLA_TIER_HIGH_MAX_MS } from "@/modules/inbox/waInboxSla";
import { waInboxCountThreads } from "@/modules/inbox/waInboxQueries";
import type { DateRange } from "./metricsService";
import { type FunnelStageKey, pickHighestFunnelStage } from "./managerFunnelMap";

export type ManagerDashboardPayload = {
  range: { dateFrom: string | null; dateTo: string | null };
  filters?: {
    queueId: string | null;
    businessPhoneNumberId: string | null;
  };
  operation: {
    awaiting: number;
    unassigned: number;
    critical: number;
    avgFirstResponseMs: number | null;
  };
  team: {
    handled: number;
    avgResponseMs: number | null;
    avgFirstResponseMs: number | null;
    closed: number;
    agents: ManagerAgentRow[];
  };
  automation: {
    autoRate: number | null;
    resolvedByAiRate: number | null;
    fallbackRate: number | null;
    playbookUsageRate: number | null;
    followUpUsageRate: number | null;
  };
  funnel: Record<FunnelStageKey, number>;
};

export type ManagerAgentRow = {
  userId: string;
  name: string | null;
  email: string | null;
  handled: number;
  avgResponseMs: number | null;
  avgFirstResponseMs: number | null;
  closed: number;
};

function tsWhere(range?: DateRange): { gte?: Date; lte?: Date } | undefined {
  if (!range?.dateFrom && !range?.dateTo) return undefined;
  const w: { gte?: Date; lte?: Date } = {};
  if (range.dateFrom) w.gte = range.dateFrom;
  if (range.dateTo) w.lte = range.dateTo;
  return w;
}

function resolveRange(search?: DateRange): DateRange {
  const dateTo = search?.dateTo ?? new Date();
  const dateFrom =
    search?.dateFrom ?? new Date(dateTo.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { dateFrom, dateTo };
}

/** Opções do dashboard gerencial; compatível com `getManagerDashboard(tenant, { range })` ou `(tenant, rangeLegado)`. */
export type ManagerDashboardSearchOpts = {
  range?: DateRange;
  /** Filtra métricas pela fila da thread; `"none"` = sem fila. */
  queueId?: string;
  /** Filtra métricas pela linha/canal WhatsApp da thread. */
  businessPhoneNumberId?: string;
};

function normalizeDashboardInput(
  input?: DateRange | ManagerDashboardSearchOpts
): { range: DateRange; queueId?: string; businessPhoneNumberId?: string } {
  if (!input) {
    return { range: resolveRange(undefined) };
  }
  if ("queueId" in input || "range" in input || "businessPhoneNumberId" in input) {
    const o = input as ManagerDashboardSearchOpts;
    return {
      range: resolveRange(o.range),
      queueId: o.queueId,
      businessPhoneNumberId: o.businessPhoneNumberId,
    };
  }
  return { range: resolveRange(input as DateRange) };
}

function queueThreadFilterSql(queueId: string | undefined): Prisma.Sql {
  if (queueId === undefined) return Prisma.sql``;
  if (queueId === "none") return Prisma.sql`AND t.queue_id IS NULL`;
  return Prisma.sql`AND t.queue_id = ${queueId}`;
}

function businessPhoneThreadFilterSql(
  businessPhoneNumberId: string | undefined
): Prisma.Sql {
  if (businessPhoneNumberId === undefined) return Prisma.sql``;
  return Prisma.sql`AND t.business_phone_number_id = ${businessPhoneNumberId}`;
}

async function countCriticalAwaiting(
  tenantId: string,
  queueId?: string,
  businessPhoneNumberId?: string
): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ c: bigint }>>`
    WITH base AS (
      SELECT
        t.id,
        t.status,
        (SELECT COUNT(*)::int FROM wa_inbox_messages mi
         WHERE mi.thread_id = t.id AND mi.tenant_id = t.tenant_id
           AND mi.direction = 'INBOUND'
           AND mi.ts > COALESCE(
             (SELECT MAX(mo.ts) FROM wa_inbox_messages mo
              WHERE mo.thread_id = t.id AND mo.tenant_id = t.tenant_id AND mo.direction = 'OUTBOUND'),
             'epoch'::timestamp
           )
        ) AS unanswered_inbound_count,
        (SELECT MAX(mi.ts) FROM wa_inbox_messages mi
         WHERE mi.thread_id = t.id AND mi.tenant_id = t.tenant_id
           AND mi.direction = 'INBOUND'
           AND mi.ts > COALESCE(
             (SELECT MAX(mo.ts) FROM wa_inbox_messages mo
              WHERE mo.thread_id = t.id AND mo.tenant_id = t.tenant_id AND mo.direction = 'OUTBOUND'),
             'epoch'::timestamp
           )
        ) AS last_unanswered_inbound_at
      FROM wa_inbox_threads t
      WHERE t.tenant_id = ${tenantId}
      ${queueThreadFilterSql(queueId)}
      ${businessPhoneThreadFilterSql(businessPhoneNumberId)}
    ),
    calc AS (
      SELECT *,
        CASE
          WHEN unanswered_inbound_count > 0
            AND base.status::text <> 'CLOSED'
            AND last_unanswered_inbound_at IS NOT NULL
          THEN (EXTRACT(EPOCH FROM (NOW() - last_unanswered_inbound_at)) * 1000)::bigint
          ELSE NULL
        END AS response_delay_ms
      FROM base
    )
    SELECT COUNT(*)::bigint AS c FROM calc
    WHERE unanswered_inbound_count > 0
      AND status::text <> 'CLOSED'
      AND response_delay_ms IS NOT NULL
      AND response_delay_ms >= ${SLA_TIER_HIGH_MAX_MS}
  `;
  return Number(rows[0]?.c ?? 0);
}

async function avgFirstResponseMsForRange(
  tenantId: string,
  range: DateRange,
  queueId?: string,
  businessPhoneNumberId?: string
): Promise<number | null> {
  const tw = tsWhere(range);
  const rows = await prisma.$queryRaw<Array<{ avg: number | null }>>`
    SELECT AVG(
      (EXTRACT(EPOCH FROM (t.first_response_at - fi.first_inbound)) * 1000)::double precision
    ) AS avg
    FROM wa_inbox_threads t
    INNER JOIN (
      SELECT thread_id, MIN(ts) AS first_inbound
      FROM wa_inbox_messages
      WHERE tenant_id = ${tenantId} AND direction = 'INBOUND'
      GROUP BY thread_id
    ) fi ON fi.thread_id = t.id
    WHERE t.tenant_id = ${tenantId}
      AND t.first_response_at IS NOT NULL
      ${queueThreadFilterSql(queueId)}
      ${businessPhoneThreadFilterSql(businessPhoneNumberId)}
      ${tw?.gte ? Prisma.sql`AND t.first_response_at >= ${tw.gte}` : Prisma.sql``}
      ${tw?.lte ? Prisma.sql`AND t.first_response_at <= ${tw.lte}` : Prisma.sql``}
  `;
  const v = rows[0]?.avg;
  if (v == null || Number.isNaN(v)) return null;
  return Math.round(v);
}

async function teamAggregates(
  tenantId: string,
  range: DateRange,
  queueId?: string,
  businessPhoneNumberId?: string
): Promise<{
  handled: number;
  avgResponseMs: number | null;
  avgFirstResponseMs: number | null;
  closed: number;
}> {
  const tw = tsWhere(range)!;

  const handledRows = await prisma.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(DISTINCT a.thread_id)::bigint AS c
    FROM wa_inbox_audit_logs a
    INNER JOIN wa_inbox_threads t ON t.id = a.thread_id AND t.tenant_id = a.tenant_id
    WHERE a.tenant_id = ${tenantId}
      AND a.action = 'message_send'
      ${queueThreadFilterSql(queueId)}
      ${businessPhoneThreadFilterSql(businessPhoneNumberId)}
      ${tw?.gte ? Prisma.sql`AND a.created_at >= ${tw.gte}` : Prisma.sql``}
      ${tw?.lte ? Prisma.sql`AND a.created_at <= ${tw.lte}` : Prisma.sql``}
  `;
  const handled = Number(handledRows[0]?.c ?? 0);

  const closedRows = await prisma.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(*)::bigint AS c
    FROM wa_inbox_threads t
    WHERE t.tenant_id = ${tenantId}
      AND t.status = 'CLOSED'
      ${queueThreadFilterSql(queueId)}
      ${businessPhoneThreadFilterSql(businessPhoneNumberId)}
      ${tw?.gte ? Prisma.sql`AND t.updated_at >= ${tw.gte}` : Prisma.sql``}
      ${tw?.lte ? Prisma.sql`AND t.updated_at <= ${tw.lte}` : Prisma.sql``}
  `;
  const closed = Number(closedRows[0]?.c ?? 0);

  const avgRespRows = await prisma.$queryRaw<Array<{ avg: number | null }>>`
    SELECT AVG(
      (EXTRACT(EPOCH FROM (t.last_agent_reply_at - t.last_customer_message_at)) * 1000)::double precision
    ) AS avg
    FROM wa_inbox_threads t
    WHERE t.tenant_id = ${tenantId}
      AND t.last_agent_reply_at IS NOT NULL
      AND t.last_customer_message_at IS NOT NULL
      AND t.last_agent_reply_at >= t.last_customer_message_at
      ${queueThreadFilterSql(queueId)}
      ${businessPhoneThreadFilterSql(businessPhoneNumberId)}
      ${tw?.gte ? Prisma.sql`AND t.updated_at >= ${tw.gte}` : Prisma.sql``}
      ${tw?.lte ? Prisma.sql`AND t.updated_at <= ${tw.lte}` : Prisma.sql``}
  `;
  const ar = avgRespRows[0]?.avg;
  const avgResponseMs =
    ar != null && !Number.isNaN(ar) ? Math.round(ar) : null;

  const avgFirst = await avgFirstResponseMsForRange(
    tenantId,
    range,
    queueId,
    businessPhoneNumberId
  );

  return {
    handled,
    avgResponseMs,
    avgFirstResponseMs: avgFirst,
    closed,
  };
}

async function buildAgentRows(
  tenantId: string,
  range: DateRange,
  queueId?: string,
  businessPhoneNumberId?: string
): Promise<ManagerAgentRow[]> {
  const tw = tsWhere(range);
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const rows: ManagerAgentRow[] = [];

  for (const u of users) {
    const handledRows = await prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(DISTINCT a.thread_id)::bigint AS c
      FROM wa_inbox_audit_logs a
      INNER JOIN wa_inbox_threads t ON t.id = a.thread_id AND t.tenant_id = a.tenant_id
      WHERE a.tenant_id = ${tenantId}
        AND a.user_id = ${u.id}
        AND a.action = 'message_send'
        ${queueThreadFilterSql(queueId)}
        ${businessPhoneThreadFilterSql(businessPhoneNumberId)}
        ${tw?.gte ? Prisma.sql`AND a.created_at >= ${tw.gte}` : Prisma.sql``}
        ${tw?.lte ? Prisma.sql`AND a.created_at <= ${tw.lte}` : Prisma.sql``}
    `;
    const handled = Number(handledRows[0]?.c ?? 0);

    const closedRows = await prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c
      FROM wa_inbox_threads t
      WHERE t.tenant_id = ${tenantId}
        AND t.assigned_to_user_id = ${u.id}
        AND t.status = 'CLOSED'
        ${queueThreadFilterSql(queueId)}
        ${businessPhoneThreadFilterSql(businessPhoneNumberId)}
        ${tw?.gte ? Prisma.sql`AND t.updated_at >= ${tw.gte}` : Prisma.sql``}
        ${tw?.lte ? Prisma.sql`AND t.updated_at <= ${tw.lte}` : Prisma.sql``}
    `;
    const closed = Number(closedRows[0]?.c ?? 0);

    const avgRespRows = await prisma.$queryRaw<Array<{ avg: number | null }>>`
      SELECT AVG(
        (EXTRACT(EPOCH FROM (t.last_agent_reply_at - t.last_customer_message_at)) * 1000)::double precision
      ) AS avg
      FROM wa_inbox_threads t
      WHERE t.tenant_id = ${tenantId}
        AND t.assigned_to_user_id = ${u.id}
        AND t.last_agent_reply_at IS NOT NULL
        AND t.last_customer_message_at IS NOT NULL
        AND t.last_agent_reply_at >= t.last_customer_message_at
        ${queueThreadFilterSql(queueId)}
        ${businessPhoneThreadFilterSql(businessPhoneNumberId)}
    `;
    const ar = avgRespRows[0]?.avg;
    const avgResponseMs =
      ar != null && !Number.isNaN(ar) ? Math.round(ar) : null;

    const avgFirstRows = await prisma.$queryRaw<Array<{ avg: number | null }>>`
      SELECT AVG(
        (EXTRACT(EPOCH FROM (t.first_response_at - fi.first_inbound)) * 1000)::double precision
      ) AS avg
      FROM wa_inbox_threads t
      INNER JOIN (
        SELECT thread_id, MIN(ts) AS first_inbound
        FROM wa_inbox_messages
        WHERE tenant_id = ${tenantId} AND direction = 'INBOUND'
        GROUP BY thread_id
      ) fi ON fi.thread_id = t.id
      WHERE t.tenant_id = ${tenantId}
        AND t.assigned_to_user_id = ${u.id}
        AND t.first_response_at IS NOT NULL
        ${queueThreadFilterSql(queueId)}
        ${businessPhoneThreadFilterSql(businessPhoneNumberId)}
    `;
    const af = avgFirstRows[0]?.avg;
    const avgFirstResponseMs =
      af != null && !Number.isNaN(af) ? Math.round(af) : null;

    rows.push({
      userId: u.id,
      name: u.name,
      email: u.email,
      handled,
      avgResponseMs,
      avgFirstResponseMs,
      closed,
    });
  }

  return rows.sort((a, b) => b.handled - a.handled || (a.name ?? "").localeCompare(b.name ?? ""));
}

async function automationBlock(
  tenantId: string,
  range: DateRange,
  queueId?: string,
  businessPhoneNumberId?: string
): Promise<ManagerDashboardPayload["automation"]> {
  const tw = tsWhere(range)!;

  const msgAgg = await prisma.$queryRaw<
    Array<{
      outbound: bigint;
      agent: bigint;
      ai: bigint;
    }>
  >`
    SELECT
      SUM(CASE WHEN m.direction::text = 'OUTBOUND' THEN 1 ELSE 0 END)::bigint AS outbound,
      SUM(CASE WHEN m.direction::text = 'OUTBOUND' AND (m.content_json->>'outboundKind') = 'agent' THEN 1 ELSE 0 END)::bigint AS agent,
      SUM(CASE WHEN m.direction::text = 'OUTBOUND' AND (m.content_json->>'outboundKind') = 'ai' THEN 1 ELSE 0 END)::bigint AS ai
    FROM wa_inbox_messages m
    INNER JOIN wa_inbox_threads t ON t.id = m.thread_id AND t.tenant_id = m.tenant_id
    WHERE m.tenant_id = ${tenantId}
      ${queueThreadFilterSql(queueId)}
      ${businessPhoneThreadFilterSql(businessPhoneNumberId)}
      ${tw?.gte ? Prisma.sql`AND m.ts >= ${tw.gte}` : Prisma.sql``}
      ${tw?.lte ? Prisma.sql`AND m.ts <= ${tw.lte}` : Prisma.sql``}
  `;

  const outbound = Number(msgAgg[0]?.outbound ?? 0);
  const agent = Number(msgAgg[0]?.agent ?? 0);
  const ai = Number(msgAgg[0]?.ai ?? 0);

  const autoOutbound = outbound - agent;
  const autoRate = outbound > 0 ? autoOutbound / outbound : null;

  const closedRows = await prisma.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(*)::bigint AS c
    FROM wa_inbox_threads t
    WHERE t.tenant_id = ${tenantId}
      AND t.status = 'CLOSED'
      ${queueThreadFilterSql(queueId)}
      ${businessPhoneThreadFilterSql(businessPhoneNumberId)}
      ${tw?.gte ? Prisma.sql`AND t.updated_at >= ${tw.gte}` : Prisma.sql``}
      ${tw?.lte ? Prisma.sql`AND t.updated_at <= ${tw.lte}` : Prisma.sql``}
  `;
  const closed = Number(closedRows[0]?.c ?? 0);

  /** Mensagens outbound com origem IA no período (proxy para resolução assistida por IA). */
  const resolvedByAiRate = closed > 0 ? Math.min(1, ai / closed) : null;

  const humanAiDenom = agent + ai;
  const fallbackRate = humanAiDenom > 0 ? agent / humanAiDenom : null;

  const activeRows = await prisma.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(DISTINCT m.thread_id)::bigint AS c
    FROM wa_inbox_messages m
    INNER JOIN wa_inbox_threads t ON t.id = m.thread_id AND t.tenant_id = m.tenant_id
    WHERE m.tenant_id = ${tenantId}
      ${queueThreadFilterSql(queueId)}
      ${businessPhoneThreadFilterSql(businessPhoneNumberId)}
      ${tw?.gte ? Prisma.sql`AND m.ts >= ${tw.gte}` : Prisma.sql``}
      ${tw?.lte ? Prisma.sql`AND m.ts <= ${tw.lte}` : Prisma.sql``}
  `;
  const activeThreads = Number(activeRows[0]?.c ?? 0);
  const denom = Math.max(1, activeThreads);

  const playbookRows = await prisma.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(*)::bigint AS c
    FROM wa_inbox_audit_logs a
    INNER JOIN wa_inbox_threads t ON t.id = a.thread_id AND t.tenant_id = a.tenant_id
    WHERE a.tenant_id = ${tenantId}
      AND a.action = 'playbook_suggest'
      ${queueThreadFilterSql(queueId)}
      ${businessPhoneThreadFilterSql(businessPhoneNumberId)}
      ${tw?.gte ? Prisma.sql`AND a.created_at >= ${tw.gte}` : Prisma.sql``}
      ${tw?.lte ? Prisma.sql`AND a.created_at <= ${tw.lte}` : Prisma.sql``}
  `;
  const followRows = await prisma.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(*)::bigint AS c
    FROM wa_inbox_audit_logs a
    INNER JOIN wa_inbox_threads t ON t.id = a.thread_id AND t.tenant_id = a.tenant_id
    WHERE a.tenant_id = ${tenantId}
      AND a.action = 'follow_up_prompt'
      ${queueThreadFilterSql(queueId)}
      ${businessPhoneThreadFilterSql(businessPhoneNumberId)}
      ${tw?.gte ? Prisma.sql`AND a.created_at >= ${tw.gte}` : Prisma.sql``}
      ${tw?.lte ? Prisma.sql`AND a.created_at <= ${tw.lte}` : Prisma.sql``}
  `;

  const playbookUsageRate = Number(playbookRows[0]?.c ?? 0) / denom;
  const followUpUsageRate = Number(followRows[0]?.c ?? 0) / denom;

  return {
    autoRate,
    resolvedByAiRate,
    fallbackRate,
    playbookUsageRate,
    followUpUsageRate,
  };
}

async function funnelCounts(
  tenantId: string,
  queueId?: string,
  businessPhoneNumberId?: string
): Promise<Record<FunnelStageKey, number>> {
  const empty: Record<FunnelStageKey, number> = {
    lead: 0,
    qualified: 0,
    proposal: 0,
    followUp: 0,
    closed: 0,
    lost: 0,
  };

  const tagRows = await prisma.waInboxThreadTag.findMany({
    where: {
      tenantId,
      ...(queueId !== undefined
        ? {
            thread:
              queueId === "none"
                ? {
                    queueId: null,
                    ...(businessPhoneNumberId
                      ? { businessPhoneNumberId }
                      : {}),
                  }
                : {
                    queueId,
                    ...(businessPhoneNumberId
                      ? { businessPhoneNumberId }
                      : {}),
                  },
          }
        : businessPhoneNumberId
          ? { thread: { businessPhoneNumberId } }
          : {}),
    },
    select: {
      threadId: true,
      tag: { select: { name: true } },
    },
  });

  const byThread = new Map<string, string[]>();
  for (const row of tagRows) {
    const list = byThread.get(row.threadId) ?? [];
    list.push(row.tag.name);
    byThread.set(row.threadId, list);
  }

  for (const names of byThread.values()) {
    const stage = pickHighestFunnelStage(names);
    if (stage) empty[stage] += 1;
  }

  return empty;
}

export async function getManagerDashboard(
  tenantId: string,
  input?: DateRange | ManagerDashboardSearchOpts
): Promise<ManagerDashboardPayload> {
  const { range: rangeIn, queueId, businessPhoneNumberId } = normalizeDashboardInput(input);
  const range = rangeIn;
  const rangeIso = {
    dateFrom: range.dateFrom?.toISOString() ?? null,
    dateTo: range.dateTo?.toISOString() ?? null,
  };

  const qf = {
    ...(queueId !== undefined ? { queueId } : {}),
    ...(businessPhoneNumberId !== undefined ? { businessPhoneNumberId } : {}),
  };

  const [awaiting, unassigned, critical, opAvgFirst, team, agents, automation, funnel] =
    await Promise.all([
      waInboxCountThreads(tenantId, { conversationPhase: "needs_response", ...qf }),
      waInboxCountThreads(tenantId, { conversationPhase: "unassigned", ...qf }),
      countCriticalAwaiting(tenantId, queueId, businessPhoneNumberId),
      avgFirstResponseMsForRange(tenantId, range, queueId, businessPhoneNumberId),
      teamAggregates(tenantId, range, queueId, businessPhoneNumberId),
      buildAgentRows(tenantId, range, queueId, businessPhoneNumberId),
      automationBlock(tenantId, range, queueId, businessPhoneNumberId),
      funnelCounts(tenantId, queueId, businessPhoneNumberId),
    ]);

  return {
    range: rangeIso,
    filters: {
      queueId: queueId ?? null,
      businessPhoneNumberId: businessPhoneNumberId ?? null,
    },
    operation: {
      awaiting,
      unassigned,
      critical,
      avgFirstResponseMs: opAvgFirst,
    },
    team: {
      handled: team.handled,
      avgResponseMs: team.avgResponseMs,
      avgFirstResponseMs: team.avgFirstResponseMs,
      closed: team.closed,
      agents,
    },
    automation,
    funnel,
  };
}
