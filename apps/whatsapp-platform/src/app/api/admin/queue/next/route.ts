import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, STAFF_ROLES } from "@/modules/auth";
import { runQueueNext } from "@/modules/inbox/inboxQueueNext";

/**
 * GET /api/admin/queue/next
 * Próxima thread elegível: status OPEN ou PENDING, sem `assignedToUserId`, mais antiga por `lastMessageAt`.
 * Com assign=true (default), atribui ao utilizador autenticado e marca agente como busy.
 * (Lógica partilhada com `GET /api/inbox/queue/next`.)
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, STAFF_ROLES, request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const assign = searchParams.get("assign") !== "false";
  const tenantId = auth!.payload.tenantId;
  const userId = auth!.payload.sub;

  const result = await runQueueNext({ tenantId, userId, assign, logSource: "admin" });

  if (result.thread === null) {
    return NextResponse.json({
      thread: null,
      message: result.message,
    });
  }

  return NextResponse.json({
    thread: result.thread,
    priority: result.priority,
    queuedAt: result.queuedAt,
  });
}
