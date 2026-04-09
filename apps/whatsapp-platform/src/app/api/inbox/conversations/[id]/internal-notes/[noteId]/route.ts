import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { deleteInternalNote } from "@/modules/inbox";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; noteId: string }> }
) {
  const auth = await getAuthFromRequest(_request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id: threadId, noteId } = await context.params;
  if (!threadId?.trim() || !noteId?.trim()) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }
  try {
    const ok = await deleteInternalNote(
      auth.payload.tenantId,
      threadId,
      noteId,
      auth.payload.sub
    );
    if (!ok) {
      return NextResponse.json({ error: "Nota não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: { message: e instanceof Error ? e.message : "Erro" } },
      { status: 500 }
    );
  }
}
