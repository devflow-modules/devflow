/**
 * Próxima thread na fila operacional (sem responsável) — partilhado por
 * `/api/inbox/queue/next` e `/api/admin/queue/next`.
 *
 * Com `assign=true`, a thread só é devolvida se o claim CAS tiver sucesso
 * (first-writer-wins). Falha de assign → `ok: false` (rota mapeia 409/403/404).
 */

import { findNextUnassignedQueueThread } from "./waInboxQueueService";
import { assignThread } from "./threadAssignmentService";
import type { AssignmentResult } from "./threadAssignmentService";
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

export type QueueNextAssignFailureReason = Extract<
  AssignmentResult,
  { ok: false }
>["reason"];

export type QueueNextResult =
  | { ok: true; thread: null; message: string; priority: 0; queuedAt: null }
  | {
      ok: true;
      thread: QueueNextThreadPayload;
      priority: number;
      queuedAt: string;
    }
  | {
      ok: false;
      reason: QueueNextAssignFailureReason;
      message: string;
    };

function assignFailureMessage(reason: QueueNextAssignFailureReason): string {
  switch (reason) {
    case "conflict":
      return "A conversa foi assumida por outro operador. Tente novamente.";
    case "closed":
      return "A próxima conversa está encerrada e não pode ser assumida.";
    case "forbidden":
      return "Sem permissão para assumir a próxima conversa.";
    case "target_not_found":
      return "Utilizador sem role operacional para assumir a conversa.";
    case "not_found":
    default:
      return "Não foi possível assumir a próxima conversa.";
  }
}

function toThreadPayload(thread: {
  id: string;
  tenantId: string;
  phoneNumber: string;
  contactName: string | null;
  status: string;
  lastMessageAt: Date;
  createdAt: Date;
  messages: Array<{
    id: string;
    direction: string;
    contentText: string | null;
    ts: Date;
  }>;
}): QueueNextThreadPayload {
  const chronological = [...thread.messages].reverse();
  return {
    id: thread.id,
    tenantId: thread.tenantId,
    phoneNumber: thread.phoneNumber,
    contactName: thread.contactName,
    status: thread.status,
    lastMessageAt: thread.lastMessageAt.toISOString(),
    createdAt: thread.createdAt.toISOString(),
    messages: chronological.map((m) => ({
      id: m.id,
      sender: m.direction === WaInboxDirection.INBOUND ? "user" : "agent",
      content: m.contentText ?? "",
      timestamp: m.ts.toISOString(),
    })),
  };
}

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
      ok: true,
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
      return {
        ok: false,
        reason: result.reason,
        message: assignFailureMessage(result.reason),
      };
    }
    logEvent("info", logSource, "queue_next_assigned", {
      tenantId,
      threadId: thread.id,
      userId,
      changed: result.changed,
    });
  }

  const threadPayload = toThreadPayload(thread);
  return {
    ok: true,
    thread: threadPayload,
    priority: 0,
    queuedAt: thread.lastMessageAt.toISOString(),
  };
}
