import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_PLATFORM_ONLY } from "@/modules/auth";
import { listPendingQueueThreads } from "@/modules/inbox/waInboxQueueService";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_PLATFORM_ONLY, request);
  if (denied) return denied;

  const pending = await listPendingQueueThreads(auth!.payload.tenantId, 100);

  const queues = pending.map((t) => ({
    id: t.id,
    threadId: t.id,
    conversationId: t.id,
    phoneNumber: t.phoneNumber,
    contactName: t.contactName,
    priority: 0,
    queuedAt: t.lastMessageAt.toISOString(),
    lastMessagePreview: t.lastMessagePreview,
    status: t.status,
  }));

  return NextResponse.json({ queues });
}
