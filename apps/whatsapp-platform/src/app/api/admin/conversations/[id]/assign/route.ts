import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest, requireRole, STAFF_ROLES } from "@/modules/auth";
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
  const denied = requireRole(auth, STAFF_ROLES, request);
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
    auth!.payload.sub
  );
  if (!assigned) {
    return NextResponse.json({ error: "Não foi possível atribuir" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
