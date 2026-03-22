import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { assignThread, unassignThread } from "@/modules/inbox";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  userId: z.string().optional(),
  unassign: z.boolean().optional(),
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
    json = {};
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const tenantId = auth.payload.tenantId;

  if (parsed.data.unassign) {
    const ok = await unassignThread(tenantId, threadId, auth.payload.sub);
    if (!ok) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { assignedTo: null } });
  }

  let userId: string = parsed.data.userId ?? auth.payload.sub;
  if (userId === "me") userId = auth.payload.sub;

  const ok = await assignThread(tenantId, threadId, userId, auth.payload.sub);
  if (!ok) {
    return NextResponse.json({ error: "Conversa não encontrada ou usuário inválido" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: { assignedTo: userId } });
}
