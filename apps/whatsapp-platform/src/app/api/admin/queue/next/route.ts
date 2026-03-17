import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/queue/next
 * Retorna a próxima conversa na fila para o tenant e, se assign=true (default),
 * remove da fila e atribui ao agente autenticado.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const assign = searchParams.get("assign") !== "false";
  const tenantId = auth.payload.tenantId;
  const userId = auth.payload.sub;

  const entry = await prisma.conversationQueue.findFirst({
    where: { tenantId },
    orderBy: [{ priority: "desc" }, { queuedAt: "asc" }],
    include: {
      conversation: {
        include: {
          messages: {
            orderBy: { timestamp: "desc" },
            take: 20,
          },
        },
      },
    },
  });

  if (!entry) {
    return NextResponse.json({ conversation: null, message: "Nenhuma conversa na fila" });
  }

  if (assign) {
    await prisma.conversationQueue.deleteMany({ where: { conversationId: entry.conversationId } });
    await prisma.agentStatus.upsert({
      where: { tenantId_userId: { tenantId, userId } },
      create: {
        tenantId,
        userId,
        status: "busy",
        currentConversationId: entry.conversationId,
      },
      update: {
        status: "busy",
        currentConversationId: entry.conversationId,
        updatedAt: new Date(),
      },
    });
  }

  return NextResponse.json({
    conversation: {
      id: entry.conversation.id,
      externalId: entry.conversation.externalId,
      tenantId: entry.conversation.tenantId,
      createdAt: entry.conversation.createdAt,
      messages: entry.conversation.messages.reverse(),
    },
    priority: entry.priority,
    queuedAt: entry.queuedAt,
  });
}
