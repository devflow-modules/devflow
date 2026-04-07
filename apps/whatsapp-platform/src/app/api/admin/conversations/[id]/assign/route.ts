import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  userId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id: threadId } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });
  }

  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId: auth.payload.tenantId },
  });
  if (!thread) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  await prisma.waInboxThread.update({
    where: { id: thread.id },
    data: { assignedToUserId: parsed.data.userId },
  });

  await prisma.agentStatus.upsert({
    where: {
      tenantId_userId: { tenantId: auth.payload.tenantId, userId: parsed.data.userId },
    },
    create: {
      tenantId: auth.payload.tenantId,
      userId: parsed.data.userId,
      status: "busy",
      currentConversationId: threadId,
    },
    update: {
      status: "busy",
      currentConversationId: threadId,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
