import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { createTag, listTagsByTenant } from "@/modules/inbox";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const tags = await listTagsByTenant(auth.payload.tenantId);
    return NextResponse.json({ success: true, data: { tags } });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: { message: e instanceof Error ? e.message : "Erro" } },
      { status: 500 }
    );
  }
}

const postSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(32).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "name obrigatório" }, { status: 400 });
  }
  const tag = await createTag(auth.payload.tenantId, {
    name: parsed.data.name,
    color: parsed.data.color,
  });
  if (!tag) {
    return NextResponse.json({ error: "Nome vazio" }, { status: 400 });
  }
  return NextResponse.json({ success: true, data: { tag } });
}
