import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { joinThread, leaveThread } from "@/modules/presence";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({
  viewing: z.boolean(),
});

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = auth.payload.tenantId;
  const userId = auth.payload.sub;
  const { id: threadId } = await context.params;

  if (!threadId?.trim()) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
  });
  if (!thread) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "viewing inválido" }, { status: 400 });
  }

  if (parsed.data.viewing) {
    joinThread(tenantId, threadId, userId, auth.payload.name);
  } else {
    leaveThread(tenantId, threadId, userId);
  }

  return NextResponse.json({ success: true, data: { viewing: parsed.data.viewing } });
}
