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

/** Mesma janela que `unansweredInboundCount` — há mensagem inbound sem resposta outbound depois. */
function sqlThreadHasUnansweredInbound(tenantId: string): Prisma.Sql {
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

function buildWaInboxThreadWhereSql(
  tenantId: string,
  filters: WaInboxThreadFilters | undefined,
  currentUserId?: string
): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`t.tenant_id = ${tenantId}`];

  if (filters?.conversationPhase) {
    const ph = filters.conversationPhase;
    if (ph === "all") {
      /* sem filtro de fase — apenas tenant + refinamentos (linha, fila, prioridade) */
    } else if (ph === "needs_response") {
      parts.push(Prisma.sql`t.status::text <> 'CLOSED'`);
      parts.push(sqlThreadHasUnansweredInbound(tenantId));
    } else if (ph === "mine") {
      if (currentUserId) parts.push(Prisma.sql`t.assigned_to_user_id = ${currentUserId}`);
      else parts.push(Prisma.sql`FALSE`);
    } else if (ph === "unassigned") {
      /** Sem dono humano e ainda há mensagem inbound por responder (fila de «assumir»). */
      parts.push(Prisma.sql`t.status::text <> 'CLOSED'`);
      parts.push(Prisma.sql`t.assigned_to_user_id IS NULL`);
      parts.push(sqlThreadHasUnansweredInbound(tenantId));
    } else if (ph === "in_attendance") {
      parts.push(Prisma.sql`t.status::text <> 'CLOSED'`);
      parts.push(Prisma.sql`t.assigned_to_user_id IS NOT NULL`);
      parts.push(Prisma.sql`NOT (${sqlThreadHasUnansweredInbound(tenantId)})`);
    } else if (ph === "awaiting_customer") {
      parts.push(Prisma.sql`t.status::text <> 'CLOSED'`);
      parts.push(Prisma.sql`t.assigned_to_user_id IS NULL`);
      parts.push(Prisma.sql`NOT (${sqlThreadHasUnansweredInbound(tenantId)})`);
    } else if (ph === "closed") {
      parts.push(Prisma.sql`t.status::text = 'CLOSED'`);
    }
  } else {
    if (filters?.status) {
      parts.push(Prisma.sql`t.status = ${filters.status}`);
    }
    if (filters?.assignedTo !== undefined) {
      if (filters.assignedTo === "unassigned") {
        parts.push(Prisma.sql`t.assigned_to_user_id IS NULL`);
      } else if (filters.assignedTo === "me" && currentUserId) {
        parts.push(Prisma.sql`t.assigned_to_user_id = ${currentUserId}`);
      } else if (filters.assignedTo) {
        parts.push(Prisma.sql`t.assigned_to_user_id = ${filters.assignedTo}`);
      }
    }
  }

  if (filters?.priority) {
    parts.push(Prisma.sql`t.priority = ${filters.priority}`);
  }
  if (filters?.tag) {
    parts.push(Prisma.sql`EXISTS (
      SELECT 1 FROM wa_inbox_thread_tags tt
      WHERE tt.thread_id = t.id AND tt.tenant_id = ${tenantId} AND tt.tag_id = ${filters.tag}
    )`);
  }
  if (filters?.businessPhoneNumberId?.trim()) {
    parts.push(Prisma.sql`t.business_phone_number_id = ${filters.businessPhoneNumberId.trim()}`);
  }
  if (filters?.queueId !== undefined) {
    if (filters.queueId === "none" || filters.queueId === "") {
      parts.push(Prisma.sql`t.queue_id IS NULL`);
    } else {
      parts.push(Prisma.sql`t.queue_id = ${filters.queueId}`);
    }
  }
  return Prisma.join(parts, " AND ");
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
  const whereSql = buildWaInboxThreadWhereSql(tenantId, opts.filters, opts.currentUserId);

  const orderedRows = await prisma.$queryRaw<OrderedListRow[]>`
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
  const whereSql = buildWaInboxThreadWhereSql(tenantId, filters, currentUserId);
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM wa_inbox_threads t WHERE ${whereSql}
  `;
  return Number(rows[0]?.count ?? 0);
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
