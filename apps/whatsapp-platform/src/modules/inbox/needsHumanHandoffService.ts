/**
 * Handoff mínimo quando IA/regra detecta necessidade de humano (`needs_human`).
 * Persiste estado na thread (PENDING + HIGH) sem depender só da UI.
 */

import {
  WaInboxThreadPriority,
  WaInboxThreadStatus,
} from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";
import { logEvent, logWhatsappPilotEvent, WHATSAPP_PILOT_EVENTS } from "@/lib/observability";
import { assignThread } from "./threadAssignmentService";
import { assignTagToThread } from "./tagService";
import { logAction } from "./auditService";

export type NeedsHumanHandoffReason =
  | "llm_needs_human"
  | "handoff_trigger_keyword"
  | "automation_rule"
  | "llm_low_confidence"
  | "llm_error"
  | "sensitive_intent";

export type ApplyNeedsHumanHandoffInput = {
  tenantId: string;
  threadId: string;
  reason: NeedsHumanHandoffReason;
  /** Correlaciona com inbound sem logar conteúdo. */
  inboundWaMessageId?: string;
  correlationId?: string;
};

export type ApplyNeedsHumanHandoffResult = {
  applied: boolean;
  /** Thread já estava em handoff operacional. */
  alreadyInHandoff: boolean;
  assignedToUserId: string | null;
};

const NEEDS_HUMAN_TAG = "needs_human";
const HANDOFF_ACTOR = "automation";

async function resolveDefaultHandoffAssigneeId(tenantId: string): Promise<string | null> {
  const envUserId = process.env.WHATSAPP_HANDOFF_DEFAULT_USER_ID?.trim();
  if (envUserId) {
    const user = await prisma.user.findFirst({
      where: { id: envUserId, tenantId },
      select: { id: true },
    });
    if (user) return user.id;
  }

  const manager = await prisma.user.findFirst({
    where: { tenantId, role: { in: ["manager", "platform_admin"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return manager?.id ?? null;
}

async function resolveDefaultHandoffQueueId(
  tenantId: string,
  currentQueueId: string | null
): Promise<string | null> {
  if (currentQueueId) return null;

  const envSlug = process.env.WHATSAPP_HANDOFF_DEFAULT_QUEUE_SLUG?.trim();
  if (envSlug) {
    const queue = await prisma.waInboxQueue.findFirst({
      where: { tenantId, slug: envSlug, isActive: true },
      select: { id: true },
    });
    if (queue) return queue.id;
  }

  const fallback = await prisma.waInboxQueue.findFirst({
    where: {
      tenantId,
      isActive: true,
      slug: { in: ["human", "humano", "geral", "support", "suporte"] },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

async function ensureNeedsHumanTagId(tenantId: string): Promise<string> {
  const existing = await prisma.waInboxTag.findFirst({
    where: { tenantId, name: NEEDS_HUMAN_TAG },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.waInboxTag.create({
    data: { tenantId, name: NEEDS_HUMAN_TAG, color: "#ef4444" },
    select: { id: true },
  });
  return created.id;
}

/**
 * Marca thread para atendimento humano: status PENDING, prioridade HIGH, tag operacional.
 * Preserva assignee manual existente; só auto-atribui se ainda não houver responsável.
 */
export async function applyNeedsHumanHandoff(
  input: ApplyNeedsHumanHandoffInput
): Promise<ApplyNeedsHumanHandoffResult> {
  const { tenantId, threadId, reason, inboundWaMessageId } = input;

  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: {
      id: true,
      status: true,
      priority: true,
      assignedToUserId: true,
      queueId: true,
    },
  });

  if (!thread) {
    return { applied: false, alreadyInHandoff: false, assignedToUserId: null };
  }

  const alreadyInHandoff =
    thread.status === WaInboxThreadStatus.PENDING &&
    thread.priority === WaInboxThreadPriority.HIGH;

  const queueId = await resolveDefaultHandoffQueueId(tenantId, thread.queueId);

  const updated = await prisma.waInboxThread.updateMany({
    where: { id: threadId, tenantId },
    data: {
      status: WaInboxThreadStatus.PENDING,
      priority: WaInboxThreadPriority.HIGH,
      ...(queueId ? { queueId } : {}),
    },
  });

  if (updated.count === 0) {
    return {
      applied: false,
      alreadyInHandoff,
      assignedToUserId: thread.assignedToUserId,
    };
  }

  let assignedToUserId = thread.assignedToUserId;
  if (!assignedToUserId) {
    const defaultUserId = await resolveDefaultHandoffAssigneeId(tenantId);
    if (defaultUserId) {
      const assignResult = await assignThread(
        tenantId,
        threadId,
        defaultUserId,
        HANDOFF_ACTOR,
        "system"
      );
      if (assignResult.ok) assignedToUserId = defaultUserId;
    }
  }

  try {
    const tagId = await ensureNeedsHumanTagId(tenantId);
    await assignTagToThread(tenantId, threadId, tagId);
  } catch {
    logEvent(
      "warn",
      "inbox",
      "needs_human_tag_failed",
      { thread_id: threadId },
      { tenant_id: tenantId }
    );
  }

  await logAction(tenantId, threadId, HANDOFF_ACTOR, "handoff_requested", {
    reason,
    ...(inboundWaMessageId ? { inboundWaMessageId } : {}),
    assignedToUserId,
    queueId: queueId ?? thread.queueId,
  });

  logWhatsappPilotEvent("info", "inbox", WHATSAPP_PILOT_EVENTS.HANDOFF_REQUESTED, {
    tenantId,
    threadId,
    metaMessageId: inboundWaMessageId,
    correlationId: input.correlationId,
    origin: "handoff",
    reason,
    assigned: Boolean(assignedToUserId),
  });

  logWhatsappPilotEvent("info", "inbox", WHATSAPP_PILOT_EVENTS.HANDOFF_APPLIED, {
    tenantId,
    threadId,
    metaMessageId: inboundWaMessageId,
    correlationId: input.correlationId,
    origin: "handoff",
    reason,
    assigned: Boolean(assignedToUserId),
  });

  logEvent(
    "info",
    "inbox",
    "needs_human_handoff_applied",
    {
      reason,
      thread_id: threadId,
      ...(inboundWaMessageId ? { inbound_wa_message_id: inboundWaMessageId } : {}),
      assigned: Boolean(assignedToUserId),
    },
    { tenant_id: tenantId, ...(input.correlationId ? { trace_id: input.correlationId } : {}) }
  );

  const { publishInboxEvent, eventConversationStatusChanged, eventConversationPriorityChanged } =
    await import("@/modules/realtime/realtime.service");
  publishInboxEvent(
    tenantId,
    eventConversationStatusChanged(tenantId, {
      threadId,
      status: WaInboxThreadStatus.PENDING,
    })
  );
  publishInboxEvent(
    tenantId,
    eventConversationPriorityChanged(tenantId, {
      threadId,
      priority: WaInboxThreadPriority.HIGH,
    })
  );

  return {
    applied: true,
    alreadyInHandoff,
    assignedToUserId,
  };
}
