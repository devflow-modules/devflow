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

  const { id: conversationId } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });
  }

  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId: auth.payload.tenantId },
  });
  if (!conv) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  await prisma.conversationQueue.deleteMany({ where: { conversationId } });
  await prisma.agentStatus.upsert({
    where: {
      tenantId_userId: { tenantId: auth.payload.tenantId, userId: parsed.data.userId },
    },
    create: {
      tenantId: auth.payload.tenantId,
      userId: parsed.data.userId,
      status: "busy",
      currentConversationId: conversationId,
    },
    update: {
      status: "busy",
      currentConversationId: conversationId,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
