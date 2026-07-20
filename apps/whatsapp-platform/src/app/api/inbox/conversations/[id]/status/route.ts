import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { updateThreadStatus } from "@/modules/inbox";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  status: z.enum(["OPEN", "PENDING", "CLOSED"]),
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
    return NextResponse.json({ error: "status inválido (OPEN, PENDING, CLOSED)" }, { status: 400 });
  }

  const result = await updateThreadStatus(
    auth.payload.tenantId,
    threadId,
    parsed.data.status,
    auth.payload.sub
  );
  if (!result.ok) {
    if (result.reason === "conflict") {
      return NextResponse.json(
        { error: "Conflito: o estado da conversa foi alterado. Atualize e tente novamente." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: { status: parsed.data.status } });
}
