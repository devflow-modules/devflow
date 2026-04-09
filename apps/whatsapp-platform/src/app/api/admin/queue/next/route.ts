import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, STAFF_ROLES } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { findNextUnassignedQueueThread } from "@/modules/inbox/waInboxQueueService";
import { assignThread } from "@/modules/inbox/threadAssignmentService";
import { logEvent } from "@/lib/observability";
import { WaInboxDirection } from "@/generated/prisma-whatsapp";

/**
 * GET /api/admin/queue/next
 * Próxima thread elegível: status OPEN ou PENDING, sem `assignedToUserId`, mais antiga por `lastMessageAt`.
 * Com assign=true (default), atribui ao utilizador autenticado e marca agente como busy.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, STAFF_ROLES, request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const assign = searchParams.get("assign") !== "false";
  const tenantId = auth!.payload.tenantId;
  const userId = auth!.payload.sub;

  const thread = await findNextUnassignedQueueThread(tenantId);

  if (!thread) {
    return NextResponse.json({
      thread: null,
      message: "Nenhuma conversa na fila",
    });
  }

  if (assign) {
    await assignThread(tenantId, thread.id, userId, userId);
    await prisma.agentStatus.upsert({
      where: { userId },
      create: {
        tenantId,
        userId,
        status: "busy",
        currentConversationId: thread.id,
      },
      update: {
        status: "busy",
        currentConversationId: thread.id,
        updatedAt: new Date(),
      },
    });
    logEvent("info", "admin", "queue_next_assigned", { tenantId, threadId: thread.id, userId });
  }

  const chronological = [...thread.messages].reverse();
  const messagesPayload = chronological.map((m) => ({
    id: m.id,
    sender: m.direction === WaInboxDirection.INBOUND ? "user" : "agent",
    content: m.contentText ?? "",
    timestamp: m.ts.toISOString(),
  }));

  const threadPayload = {
    id: thread.id,
    tenantId: thread.tenantId,
    phoneNumber: thread.phoneNumber,
    contactName: thread.contactName,
    status: thread.status,
    lastMessageAt: thread.lastMessageAt.toISOString(),
    createdAt: thread.createdAt.toISOString(),
    messages: messagesPayload,
  };

  return NextResponse.json({
    thread: threadPayload,
    priority: 0,
    queuedAt: thread.lastMessageAt.toISOString(),
  });
}
