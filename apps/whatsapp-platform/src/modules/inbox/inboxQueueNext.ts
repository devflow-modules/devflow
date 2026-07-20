/**
 * Próxima thread na fila operacional (sem responsável) — partilhado por
 * `/api/inbox/queue/next` e `/api/admin/queue/next`.
 */

import { findNextUnassignedQueueThread } from "./waInboxQueueService";
import { assignThread } from "./threadAssignmentService";
import { logEvent } from "@/lib/observability";
import { WaInboxDirection } from "@/generated/prisma-whatsapp";
import type { UserRole } from "@/modules/auth";

export type QueueNextThreadPayload = {
  id: string;
  tenantId: string;
  phoneNumber: string;
  contactName: string | null;
  status: string;
  lastMessageAt: string;
  createdAt: string;
  messages: Array<{ id: string; sender: string; content: string; timestamp: string }>;
};

export type QueueNextResult =
  | { thread: null; message: string; priority: number; queuedAt: null }
  | {
      thread: QueueNextThreadPayload;
      priority: number;
      queuedAt: string;
      message?: undefined;
    };

export async function runQueueNext(opts: {
  tenantId: string;
  userId: string;
  role: UserRole;
  assign: boolean;
  /** default "admin" — inbox usa "inbox" nos logs */
  logSource?: "admin" | "inbox";
}): Promise<QueueNextResult> {
  const { tenantId, userId, role, assign, logSource = "admin" } = opts;
  const thread = await findNextUnassignedQueueThread(tenantId);

  if (!thread) {
    return {
      thread: null,
      message: "Nenhuma conversa na fila",
      priority: 0,
      queuedAt: null,
    };
  }

  if (assign) {
    const result = await assignThread(tenantId, thread.id, userId, userId, role);
    if (!result.ok) {
      logEvent("warn", logSource, "queue_next_assign_failed", {
        tenantId,
        threadId: thread.id,
        userId,
        reason: result.reason,
      });
    } else {
      logEvent("info", logSource, "queue_next_assigned", { tenantId, threadId: thread.id, userId });
    }
  }

  const chronological = [...thread.messages].reverse();
  const messagesPayload = chronological.map((m) => ({
    id: m.id,
    sender: m.direction === WaInboxDirection.INBOUND ? "user" : "agent",
    content: m.contentText ?? "",
    timestamp: m.ts.toISOString(),
  }));

  const threadPayload: QueueNextThreadPayload = {
    id: thread.id,
    tenantId: thread.tenantId,
    phoneNumber: thread.phoneNumber,
    contactName: thread.contactName,
    status: thread.status,
    lastMessageAt: thread.lastMessageAt.toISOString(),
    createdAt: thread.createdAt.toISOString(),
    messages: messagesPayload,
  };

  return {
    thread: threadPayload,
    priority: 0,
    queuedAt: thread.lastMessageAt.toISOString(),
  };
}
