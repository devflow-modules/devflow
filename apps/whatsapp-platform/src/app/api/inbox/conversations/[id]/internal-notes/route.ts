import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { createInternalNote, listInternalNotes } from "@/modules/inbox";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(_request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id: threadId } = await context.params;
  if (!threadId?.trim()) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }
  try {
    const notes = await listInternalNotes(auth.payload.tenantId, threadId);
    return NextResponse.json({ success: true, data: { notes } });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: { message: e instanceof Error ? e.message : "Erro" } },
      { status: 500 }
    );
  }
}

const postSchema = z.object({
  body: z.string().min(1).max(20_000),
});

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
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "body obrigatório" }, { status: 400 });
  }
  try {
    const note = await createInternalNote(
      auth.payload.tenantId,
      threadId,
      auth.payload.sub,
      parsed.data.body
    );
    if (!note) {
      return NextResponse.json({ error: "Conversa não encontrada ou texto vazio" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { note } });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: { message: e instanceof Error ? e.message : "Erro" } },
      { status: 500 }
    );
  }
}
