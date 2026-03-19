import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getTagsForThread, assignTagToThread, removeTagFromThread } from "@/modules/inbox";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
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
  try {
    const tags = await getTagsForThread(auth.payload.tenantId, threadId);
    return NextResponse.json({ success: true, data: { tags } });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: { message: e instanceof Error ? e.message : "Erro" } },
      { status: 500 }
    );
  }
}

const bodySchema = z.object({
  tagId: z.string(),
  action: z.enum(["add", "remove"]),
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
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "tagId e action (add|remove) obrigatórios" }, { status: 400 });
  }
  const { tagId, action } = parsed.data;
  if (action === "add") {
    const ok = await assignTagToThread(auth.payload.tenantId, threadId, tagId);
    if (!ok) {
      return NextResponse.json({ error: "Conversa ou tag não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { action: "add", tagId } });
  }
  const ok = await removeTagFromThread(auth.payload.tenantId, threadId, tagId);
  if (!ok) {
    return NextResponse.json({ error: "Associação não encontrada" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: { action: "remove", tagId } });
}
