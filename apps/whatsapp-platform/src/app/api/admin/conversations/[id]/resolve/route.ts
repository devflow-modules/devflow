import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, STAFF_ROLES } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";
import { updateThreadStatus } from "@/modules/inbox/threadStatusService";

/**
 * PATCH /api/admin/conversations/[id]/resolve
 * `id` = wa_inbox_threads.id. Fecha a thread e liberta agentes com essa conversa atual.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(_request);
  const denied = requireRole(auth, STAFF_ROLES, _request);
  if (denied) return denied;

  const { id: threadId } = await params;
  const tenantId = auth!.payload.tenantId;

  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
  });
  if (thread) {
    await updateThreadStatus(tenantId, threadId, WaInboxThreadStatus.CLOSED, auth!.payload.sub);
  }

  const agentStatuses = await prisma.agentStatus.findMany({
    where: { tenantId, currentConversationId: threadId },
  });

  for (const as_ of agentStatuses) {
    await prisma.agentStatus.update({
      where: { id: as_.id },
      data: { status: "available", currentConversationId: null, updatedAt: new Date() },
    });
  }

  return NextResponse.json({ success: true, resolved: true });
}
