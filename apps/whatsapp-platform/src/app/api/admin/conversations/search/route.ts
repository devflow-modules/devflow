import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ conversations: [] });
  const messages = await prisma.message.findMany({
    where: {
      content: { contains: q, mode: "insensitive" },
      conversation: { tenantId: auth.payload.tenantId },
    },
    take: 100,
    select: { conversationId: true },
  });
  const convIds = [...new Set(messages.map((m) => m.conversationId))];
  const conversations = await prisma.conversation.findMany({
    where: { id: { in: convIds } },
    include: { _count: { select: { messages: true } } },
  });
  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      externalId: c.externalId,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
    })),
  });
}
