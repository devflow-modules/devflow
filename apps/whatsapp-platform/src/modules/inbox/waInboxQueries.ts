import {
  WaInboxThreadStatus,
  Prisma,
} from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";
import {
  deriveConversationState,
  lastResponderTypeFromLastMessage,
  type ConversationState,
  type LastResponderType,
} from "./waInboxConversationState";
import {
  computeSlaLevel,
  SLA_TIER_HIGH_MAX_MS,
  SLA_TIER_LOW_MAX_MS,
  SLA_TIER_MEDIUM_MAX_MS,
  type SlaLevel,
} from "./waInboxSla";
import type { InboxProspectLens } from "./inboxProspectLens";

/** Filtro operacional (UI). Quando definido, ignora `status` e `assignedTo` legacy. */
export type WaInboxConversationPhaseFilter =
  | "all"
  | "needs_response"
  | "mine"
  | "unassigned"
  | "in_attendance"
  | "awaiting_customer"
  | "closed";

export type WaInboxThreadFilters = {
  status?: WaInboxThreadStatus;
  assignedTo?: string; // userId or "unassigned" | "me"
  tag?: string; // tagId
  priority?: string;
  /** Meta phone_number_id da linha WhatsApp */
  businessPhoneNumberId?: string;
  conversationPhase?: WaInboxConversationPhaseFilter;
  /** Filtra por fila operacional; `"none"` = sem fila (`queue_id` nulo). */
  queueId?: string;
  /** Filtro em `lead_data.prospect` / score (lista + contagem). */
  prospectLens?: InboxProspectLens;
};

const listInclude = {
  assignedToUser: { select: { id: true, name: true, email: true } },
  threadTags: { include: { tag: true } },
  queue: { select: { id: true, name: true, slug: true, color: true } },
} as const;

export type WaInboxListedThread = Prisma.WaInboxThreadGetPayload<{ include: typeof listInclude }> & {
  unansweredInboundCount: number;
  conversationState: ConversationState;
  lastResponderType: LastResponderType;
  /** Tempo desde a última inbound pendente (ms); só em awaiting_agent. */
  responseDelayMs: number | null;
  slaLevel: SlaLevel | null;
  isUnassigned: boolean;
  isAssignedToMe: boolean;
  lastUnansweredInboundAt: string | null;
};

function buildWaInboxThreadWhereParts(
  tenantId: string,
  filters: WaInboxThreadFilters | undefined,
  currentUserId?: string
): Prisma.Sql[] {
  const parts: Prisma.Sql[] = [Prisma.sql`t.tenant_id = ${tenantId}`];
  const and = (clause: Prisma.Sql) => {
    parts.push(clause);
  };

  if (filters?.conversationPhase) {
    const ph = filters.conversationPhase;
    if (ph === "all") {
      /* sem filtro de fase — apenas tenant + refinamentos (linha, fila, prioridade) */
    } else if (ph === "needs_response") {
      and(Prisma.sql`t.status::text <> 'CLOSED'`);
    } else if (ph === "mine") {
      if (currentUserId) and(Prisma.sql`t.assigned_to_user_id = ${currentUserId}`);
      else and(Prisma.sql`FALSE`);
    } else if (ph === "unassigned") {
      and(Prisma.sql`t.status::text <> 'CLOSED'`);
      and(Prisma.sql`t.assigned_to_user_id IS NULL`);
    } else if (ph === "in_attendance") {
      and(Prisma.sql`t.status::text <> 'CLOSED'`);
      and(Prisma.sql`t.assigned_to_user_id IS NOT NULL`);
    } else if (ph === "awaiting_customer") {
      and(Prisma.sql`t.status::text <> 'CLOSED'`);
      and(Prisma.sql`t.assigned_to_user_id IS NULL`);
    } else if (ph === "closed") {
      and(Prisma.sql`t.status::text = 'CLOSED'`);
    }
  } else {
    if (filters?.status) {
      and(Prisma.sql`t.status = ${filters.status}`);
    }
    if (filters?.assignedTo !== undefined) {
      if (filters.assignedTo === "unassigned") {
        and(Prisma.sql`t.assigned_to_user_id IS NULL`);
      } else if (filters.assignedTo === "me" && currentUserId) {
        and(Prisma.sql`t.assigned_to_user_id = ${currentUserId}`);
      } else if (filters.assignedTo) {
        and(Prisma.sql`t.assigned_to_user_id = ${filters.assignedTo}`);
      }
    }
  }

  if (filters?.priority) {
    and(Prisma.sql`t.priority = ${filters.priority}`);
  }
  if (filters?.tag) {
    and(Prisma.sql`EXISTS (
      SELECT 1 FROM wa_inbox_thread_tags tt
      WHERE tt.thread_id = t.id AND tt.tenant_id = ${tenantId} AND tt.tag_id = ${filters.tag}
    )`);
  }
  if (filters?.businessPhoneNumberId?.trim()) {
    and(Prisma.sql`t.business_phone_number_id = ${filters.businessPhoneNumberId.trim()}`);
  }
  if (filters?.queueId !== undefined) {
    if (filters.queueId === "none" || filters.queueId === "") {
      and(Prisma.sql`t.queue_id IS NULL`);
    } else {
      and(Prisma.sql`t.queue_id = ${filters.queueId}`);
    }
  }

  const lens = filters?.prospectLens;
  if (lens === "followup_due") {
    and(Prisma.sql`(
      t.lead_data IS NOT NULL
      AND NULLIF(btrim(t.lead_data::jsonb #>> '{prospect,nextFollowUpAt}'), '') IS NOT NULL
      AND (t.lead_data::jsonb #>> '{prospect,nextFollowUpAt}') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
      AND (t.lead_data::jsonb #>> '{prospect,nextFollowUpAt}')::timestamptz
        <= (date_trunc('day', now()) + interval '1 day' - interval '1 second')
    )`);
  } else if (lens === "proposal_open") {
    and(Prisma.sql`t.lead_data::jsonb->'prospect'->>'salesStage' = 'PROPOSAL_SENT'`);
  } else if (lens === "diagnosis_scheduled") {
    and(Prisma.sql`t.lead_data::jsonb->'prospect'->>'salesStage' = 'DIAGNOSIS_SCHEDULED'`);
  } else if (lens === "hot_lead") {
    and(Prisma.sql`t.lead_score >= 40`);
  } else if (lens === "pending_inbound") {
    and(Prisma.sql`t.status::text <> 'CLOSED'`);
    and(Prisma.sql`EXISTS (
      SELECT 1 FROM wa_inbox_messages mi
      WHERE mi.thread_id = t.id AND mi.tenant_id = t.tenant_id AND mi.direction = 'INBOUND'
        AND mi.ts > COALESCE(
          (SELECT MAX(mo.ts) FROM wa_inbox_messages mo
           WHERE mo.thread_id = t.id AND mo.tenant_id = t.tenant_id AND mo.direction = 'OUTBOUND'),
          'epoch'::timestamp
        )
    )`);
  }

  return parts;
}

function combineWhereParts(parts: Prisma.Sql[]): Prisma.Sql {
  if (parts.length === 0) return Prisma.sql`TRUE`;
  return parts.slice(1).reduce((acc, clause) => Prisma.sql`${acc} AND ${clause}`, parts[0]);
}

type OrderedListRow = {
  id: string;
  unanswered_inbound_count: bigint | number | null;
  last_direction: string | null;
  last_content_json: unknown | null;
  last_unanswered_inbound_at: Date | null;
  response_delay_ms: bigint | number | null;
};

/**
 * Lista threads com ordenação: bucket (awaiting_agent → … → closed);
 * dentro de awaiting_agent: SLA (crítico primeiro) e maior atraso primeiro.
 */
export async function waInboxListThreads(
  tenantId: string,
  opts: { take: number; skip: number; filters?: WaInboxThreadFilters; currentUserId?: string }
): Promise<WaInboxListedThread[]> {
  const whereParts = buildWaInboxThreadWhereParts(tenantId, opts.filters, opts.currentUserId);
  const whereSql = combineWhereParts(whereParts);

  const listQuery = Prisma.sql`
    WITH base AS (
      SELECT
        t.id,
        (SELECT COUNT(*)::int FROM wa_inbox_messages mi
         WHERE mi.thread_id = t.id AND mi.tenant_id = t.tenant_id
           AND mi.direction = 'INBOUND'
           AND mi.ts > COALESCE(
             (SELECT MAX(mo.ts) FROM wa_inbox_messages mo
              WHERE mo.thread_id = t.id AND mo.tenant_id = t.tenant_id AND mo.direction = 'OUTBOUND'),
             'epoch'::timestamp
           )
        ) AS unanswered_inbound_count,
        (SELECT m.direction::text FROM wa_inbox_messages m
         WHERE m.thread_id = t.id AND m.tenant_id = t.tenant_id
         ORDER BY m.ts DESC, m.id DESC LIMIT 1) AS last_direction,
        (SELECT m.content_json FROM wa_inbox_messages m
         WHERE m.thread_id = t.id AND m.tenant_id = t.tenant_id
         ORDER BY m.ts DESC, m.id DESC LIMIT 1) AS last_content_json,
        (SELECT MAX(mi.ts) FROM wa_inbox_messages mi
         WHERE mi.thread_id = t.id AND mi.tenant_id = t.tenant_id
           AND mi.direction = 'INBOUND'
           AND mi.ts > COALESCE(
             (SELECT MAX(mo.ts) FROM wa_inbox_messages mo
              WHERE mo.thread_id = t.id AND mo.tenant_id = t.tenant_id AND mo.direction = 'OUTBOUND'),
             'epoch'::timestamp
           )
        ) AS last_unanswered_inbound_at,
        t.last_message_at,
        t.status,
        t.assigned_to_user_id,
        t.lead_score
      FROM wa_inbox_threads t
      WHERE ${whereSql}
    ),
    calc AS (
      SELECT
        base.*,
        CASE
          WHEN base.unanswered_inbound_count > 0
            AND base.status::text <> 'CLOSED'
            AND base.last_unanswered_inbound_at IS NOT NULL
          THEN (EXTRACT(EPOCH FROM (NOW() - base.last_unanswered_inbound_at)) * 1000)::bigint
          ELSE NULL
        END AS response_delay_ms
      FROM base
    ),
    ranked AS (
      SELECT
        calc.*,
        CASE
          WHEN calc.status::text = 'CLOSED' THEN 3
          WHEN calc.unanswered_inbound_count > 0 THEN 0
          WHEN calc.assigned_to_user_id IS NOT NULL THEN 1
          ELSE 2
        END AS sort_bucket,
        CASE
          WHEN calc.unanswered_inbound_count = 0
            OR calc.status::text = 'CLOSED'
            OR calc.last_unanswered_inbound_at IS NULL
            OR calc.response_delay_ms IS NULL
          THEN 0
          WHEN calc.response_delay_ms < ${SLA_TIER_LOW_MAX_MS} THEN 1
          WHEN calc.response_delay_ms < ${SLA_TIER_MEDIUM_MAX_MS} THEN 2
          WHEN calc.response_delay_ms < ${SLA_TIER_HIGH_MAX_MS} THEN 3
          ELSE 4
        END AS sla_sort
      FROM calc
    )
    SELECT
      ranked.id,
      ranked.unanswered_inbound_count,
      ranked.last_direction,
      ranked.last_content_json,
      ranked.last_unanswered_inbound_at,
      ranked.response_delay_ms
    FROM ranked
    ORDER BY
      ranked.sort_bucket ASC,
      CASE WHEN ranked.sort_bucket = 0 THEN ranked.sla_sort ELSE 0 END DESC,
      CASE WHEN ranked.sort_bucket = 0 THEN ranked.response_delay_ms ELSE 0 END DESC NULLS LAST,
      ranked.lead_score DESC,
      ranked.last_message_at DESC
    LIMIT ${opts.take} OFFSET ${opts.skip}
  `;
  let orderedRows: OrderedListRow[];
  try {
    orderedRows = await prisma.$queryRaw<OrderedListRow[]>(listQuery);
  } catch (error) {
    console.error("[inbox] waInboxListThreads raw query failed", {
      tenantId,
      filters: opts.filters,
      message: error instanceof Error ? error.message : error,
      queryText: listQuery.text,
    });
    throw error;
  }

  const ids = orderedRows.map((r) => r.id);
  if (ids.length === 0) return [];

  const threads = await prisma.waInboxThread.findMany({
    where: { id: { in: ids }, tenantId },
    include: listInclude,
  });
  const byId = new Map(threads.map((t) => [t.id, t]));
  const uid = opts.currentUserId;
  const metricsById = new Map(
    orderedRows.map((r) => {
      const unansweredInboundCount = Number(r.unanswered_inbound_count ?? 0);
      const responseDelayMs =
        r.response_delay_ms != null ? Number(r.response_delay_ms) : null;
      return [
        r.id,
        {
          unansweredInboundCount,
          lastResponderType: lastResponderTypeFromLastMessage(
            r.last_direction,
            r.last_content_json
          ),
          responseDelayMs,
          slaLevel: computeSlaLevel(responseDelayMs),
          lastUnansweredInboundAt: r.last_unanswered_inbound_at
            ? new Date(r.last_unanswered_inbound_at).toISOString()
            : null,
        },
      ];
    })
  );

  return ids
    .map((id) => {
      const t = byId.get(id);
      const m = metricsById.get(id);
      if (!t || !m) return null;
      const conversationState = deriveConversationState({
        threadStatus: t.status,
        assignedToUserId: t.assignedToUserId,
        unansweredInboundCount: m.unansweredInboundCount,
      });
      const isUnassigned = t.assignedToUserId == null;
      const isAssignedToMe = Boolean(uid && t.assignedToUserId === uid);
      return {
        ...t,
        unansweredInboundCount: m.unansweredInboundCount,
        conversationState,
        lastResponderType: m.lastResponderType,
        responseDelayMs: m.responseDelayMs,
        slaLevel: m.slaLevel,
        isUnassigned,
        isAssignedToMe,
        lastUnansweredInboundAt: m.lastUnansweredInboundAt,
      };
    })
    .filter((row): row is WaInboxListedThread => row !== null);
}

export async function waInboxCountThreads(
  tenantId: string,
  filters?: WaInboxThreadFilters,
  currentUserId?: string
): Promise<number> {
  const where: Prisma.WaInboxThreadWhereInput = { tenantId };

  if (filters?.conversationPhase) {
    switch (filters.conversationPhase) {
      case "closed":
        where.status = WaInboxThreadStatus.CLOSED;
        break;
      case "mine":
        where.assignedToUserId = currentUserId ?? "__no_user__";
        break;
      case "unassigned":
      case "awaiting_customer":
        where.status = { not: WaInboxThreadStatus.CLOSED };
        where.assignedToUserId = null;
        break;
      case "in_attendance":
        where.status = { not: WaInboxThreadStatus.CLOSED };
        where.assignedToUserId = { not: null };
        break;
      case "needs_response":
        where.status = { not: WaInboxThreadStatus.CLOSED };
        break;
      case "all":
      default:
        break;
    }
  } else {
    if (filters?.status) where.status = filters.status;
    if (filters?.assignedTo === "unassigned") where.assignedToUserId = null;
    else if (filters?.assignedTo === "me") where.assignedToUserId = currentUserId ?? "__no_user__";
    else if (filters?.assignedTo) where.assignedToUserId = filters.assignedTo;
  }

  if (filters?.priority) {
    where.priority = filters.priority as "LOW" | "MEDIUM" | "HIGH";
  }
  if (filters?.businessPhoneNumberId?.trim()) {
    where.businessPhoneNumberId = filters.businessPhoneNumberId.trim();
  }
  if (filters?.queueId !== undefined) {
    if (filters.queueId === "none" || filters.queueId === "") where.queueId = null;
    else where.queueId = filters.queueId;
  }
  if (filters?.tag) {
    where.threadTags = { some: { tenantId, tagId: filters.tag } };
  }

  if (filters?.prospectLens) {
    const whereParts = buildWaInboxThreadWhereParts(tenantId, filters, currentUserId);
    const whereSql = combineWhereParts(whereParts);
    const rows = await prisma.$queryRaw<[{ c: bigint }]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS c FROM wa_inbox_threads t WHERE ${whereSql}
    `);
    return Number(rows[0]?.c ?? 0);
  }

  return prisma.waInboxThread.count({ where });
}

export async function waInboxGetThread(tenantId: string, threadId: string) {
  return prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    include: {
      assignedToUser: { select: { id: true, name: true, email: true } },
      threadTags: { include: { tag: true } },
      queue: { select: { id: true, name: true, slug: true, color: true } },
    },
  });
}

export type WhatsappLineSummary = {
  phoneNumberId: string;
  label: string | null;
  displayPhoneNumber: string | null;
  isPrimary: boolean;
  isDefaultOutbound: boolean;
  status: string;
};

export async function fetchWhatsappLineSummaries(
  tenantId: string,
  metaPhoneNumberIds: string[]
): Promise<Map<string, WhatsappLineSummary>> {
  const ids = [...new Set(metaPhoneNumberIds.map((x) => x.trim()).filter(Boolean))];
  if (ids.length === 0) return new Map();
  const rows = await prisma.whatsappPhoneNumber.findMany({
    where: { tenantId, phoneNumberId: { in: ids } },
    select: {
      phoneNumberId: true,
      label: true,
      displayPhoneNumber: true,
      isPrimary: true,
      isDefaultOutbound: true,
      status: true,
    },
  });
  return new Map(
    rows.map((r) => [
      r.phoneNumberId,
      {
        phoneNumberId: r.phoneNumberId,
        label: r.label,
        displayPhoneNumber: r.displayPhoneNumber,
        isPrimary: r.isPrimary,
        isDefaultOutbound: r.isDefaultOutbound,
        status: r.status,
      },
    ])
  );
}
