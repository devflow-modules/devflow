/**
 * Métricas de inbox por thread (pendência real + último interveniente + SLA).
 * Usado na listagem e nos patches realtime após nova mensagem.
 */

import type { Prisma } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";
import {
  deriveConversationState,
  lastResponderTypeFromLastMessage,
  type ConversationState,
  type LastResponderType,
} from "./waInboxConversationState";
import { computeResponseDelayMs, computeSlaLevel, type SlaLevel } from "./waInboxSla";

export type WaInboxThreadInboxMetrics = {
  unansweredInboundCount: number;
  conversationState: ConversationState;
  lastResponderType: LastResponderType;
  lastMessageAt: string;
  responseDelayMs: number | null;
  slaLevel: SlaLevel | null;
  isUnassigned: boolean;
  lastUnansweredInboundAt: string | null;
  /** Última mensagem inbound (qualquer), para regras `lastInboundMinutesAgo`. */
  lastInboundMessageAt: string | null;
};

type MetricsRow = {
  unanswered_inbound_count: bigint | number | null;
  last_direction: string | null;
  last_content_json: unknown | null;
  last_message_at: Date | null;
  thread_status: string;
  assigned_to_user_id: string | null;
  last_unanswered_inbound_at: Date | null;
  last_inbound_message_at: Date | null;
};

export async function getWaInboxThreadInboxMetrics(
  tenantId: string,
  threadId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma
): Promise<WaInboxThreadInboxMetrics | null> {
  const rows = await tx.$queryRaw<MetricsRow[]>`
    SELECT
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
      t.last_message_at AS last_message_at,
      t.status::text AS thread_status,
      t.assigned_to_user_id AS assigned_to_user_id,
      (SELECT MAX(mi.ts) FROM wa_inbox_messages mi
       WHERE mi.thread_id = t.id AND mi.tenant_id = t.tenant_id
         AND mi.direction = 'INBOUND'
         AND mi.ts > COALESCE(
           (SELECT MAX(mo.ts) FROM wa_inbox_messages mo
            WHERE mo.thread_id = t.id AND mo.tenant_id = t.tenant_id AND mo.direction = 'OUTBOUND'),
           'epoch'::timestamp
         )
      ) AS last_unanswered_inbound_at,
      (SELECT MAX(mi.ts) FROM wa_inbox_messages mi
       WHERE mi.thread_id = t.id AND mi.tenant_id = t.tenant_id
         AND mi.direction = 'INBOUND'
      ) AS last_inbound_message_at
    FROM wa_inbox_threads t
    WHERE t.tenant_id = ${tenantId} AND t.id = ${threadId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return mapMetricsRow(row);
}

function mapMetricsRow(row: MetricsRow): WaInboxThreadInboxMetrics {
  const unansweredInboundCount = Number(row.unanswered_inbound_count ?? 0);
  const conversationState = deriveConversationState({
    threadStatus: row.thread_status,
    assignedToUserId: row.assigned_to_user_id,
    unansweredInboundCount,
  });
  const lastResponderType = lastResponderTypeFromLastMessage(
    row.last_direction,
    row.last_content_json
  );
  const lastMessageAt = (row.last_message_at ?? new Date()).toISOString();
  const awaitingAgent = conversationState === "awaiting_agent";
  const lastUnansweredAt = row.last_unanswered_inbound_at
    ? new Date(row.last_unanswered_inbound_at)
    : null;
  const responseDelayMs = computeResponseDelayMs(awaitingAgent, lastUnansweredAt, new Date());
  const slaLevel = computeSlaLevel(responseDelayMs);
  const lastInboundMsg = row.last_inbound_message_at
    ? new Date(row.last_inbound_message_at)
    : null;
  return {
    unansweredInboundCount,
    conversationState,
    lastResponderType,
    lastMessageAt,
    responseDelayMs,
    slaLevel,
    isUnassigned: row.assigned_to_user_id == null,
    lastUnansweredInboundAt: lastUnansweredAt ? lastUnansweredAt.toISOString() : null,
    lastInboundMessageAt: lastInboundMsg ? lastInboundMsg.toISOString() : null,
  };
}
