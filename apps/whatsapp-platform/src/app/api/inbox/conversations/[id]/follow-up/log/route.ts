import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/modules/inbox";

export const dynamic = "force-dynamic";

/** Regista uso da sugestão de follow-up no histórico operacional. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id: threadId } = await context.params;
  if (!threadId?.trim()) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }
  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId: auth.payload.tenantId },
    select: { id: true },
  });
  if (!thread) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }
  await logAction(auth.payload.tenantId, threadId, auth.payload.sub, "follow_up_prompt", {
    source: "inbox_ui",
  });
  return NextResponse.json({ success: true });
}
