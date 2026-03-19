import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { waInboxGetThread, waInboxListMessages } from "@/modules/inbox";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  const thread = await waInboxGetThread(auth.payload.tenantId, id);
  if (!thread) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const take = Math.min(
    Math.max(1, parseInt(searchParams.get("limit") || "100", 10) || 100),
    500
  );
  const skip = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);

  try {
    const messages = await waInboxListMessages(auth.payload.tenantId, id, { take, skip });
    return NextResponse.json({
      success: true,
      data: {
        threadId: id,
        messages: messages ?? [],
        pagination: { limit: take, offset: skip },
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: { message: e instanceof Error ? e.message : "Erro" } },
      { status: 500 }
    );
  }
}
