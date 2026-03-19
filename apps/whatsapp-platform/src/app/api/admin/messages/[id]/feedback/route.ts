import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  rating: z.union([z.literal(1), z.literal(-1)]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: messageId } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "rating deve ser 1 ou -1" }, { status: 400 });

  const msg = await prisma.message.findFirst({
    where: { id: messageId },
    include: { conversation: true },
  });
  if (!msg || msg.conversation.tenantId !== auth.payload.tenantId) {
    return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 });
  }

  await prisma.messageFeedback.create({
    data: {
      messageId,
      conversationId: msg.conversationId,
      rating: parsed.data.rating,
      agentId: auth.payload.sub,
    },
  });
  return NextResponse.json({ success: true });
}
