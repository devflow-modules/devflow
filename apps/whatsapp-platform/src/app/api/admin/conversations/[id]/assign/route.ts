import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest, requireRole, ROLES_PLATFORM_ONLY } from "@/modules/auth";
import { getClientIp } from "@/lib/rate-limit";
import { recordPlatformAudit } from "@/lib/platformAuditLog";
import { prisma } from "@/lib/prisma";
import { assignThread } from "@/modules/inbox/threadAssignmentService";

const bodySchema = z.object({
  userId: z.string().min(1),
});

/**
 * Staff: mesma regra de atribuição que `/api/inbox/conversations/[id]/assign`
 * (`assignThread` + presença em `whatsapp_agent_status` já centralizados no serviço).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_PLATFORM_ONLY, request);
  if (denied) return denied;

  const { id: threadId } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });
  }

  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId: auth!.payload.tenantId },
  });
  if (!thread) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  const assigned = await assignThread(
    auth!.payload.tenantId,
    threadId,
    parsed.data.userId,
    auth!.payload.sub,
    auth!.payload.role
  );
  if (!assigned.ok) {
    const status =
      assigned.reason === "forbidden"
        ? 403
        : assigned.reason === "conflict" || assigned.reason === "closed"
          ? 409
          : assigned.reason === "target_not_found" || assigned.reason === "not_found"
            ? 404
            : 400;
    return NextResponse.json({ error: "Não foi possível atribuir", reason: assigned.reason }, { status });
  }

  // No-op idempotente (já atribuído ao destino): sem audit de plataforma.
  if (assigned.changed) {
    recordPlatformAudit({
      action: "admin.conversation.assign",
      tenantId: auth!.payload.tenantId,
      userId: auth!.payload.sub,
      resourceType: "wa_inbox_thread",
      resourceId: threadId,
      metadata: {
        assignedUserId: parsed.data.userId,
        ip: getClientIp(request),
      },
    });
  }

  return NextResponse.json({ success: true, changed: assigned.changed });
}
