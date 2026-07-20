import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import type { UserRole } from "@/modules/auth";
import { assignThread, unassignThread } from "@/modules/inbox";
import type { AssignmentResult } from "@/modules/inbox";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  userId: z.string().optional(),
  unassign: z.boolean().optional(),
});

function httpForAssignmentFailure(result: Extract<AssignmentResult, { ok: false }>): NextResponse {
  switch (result.reason) {
    case "forbidden":
      return NextResponse.json({ error: "Sem permissão para alterar o responsável." }, { status: 403 });
    case "conflict":
      return NextResponse.json(
        { error: "Conflito: a conversa já tem responsável ou foi alterada. Atualize e tente novamente." },
        { status: 409 }
      );
    case "closed":
      return NextResponse.json(
        { error: "Não é possível alterar o responsável de uma conversa encerrada." },
        { status: 409 }
      );
    case "target_not_found":
      return NextResponse.json(
        { error: "Utilizador destino não encontrado ou sem role operacional neste tenant." },
        { status: 404 }
      );
    case "not_found":
    default:
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }
}

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
  const callerRole = auth.payload.role as UserRole;
  const callerUserId = auth.payload.sub;

  if (parsed.data.unassign) {
    const result = await unassignThread(tenantId, threadId, callerUserId, callerRole);
    if (!result.ok) return httpForAssignmentFailure(result);
    return NextResponse.json({ success: true, data: { assignedTo: null, changed: result.changed } });
  }

  let userId: string = parsed.data.userId ?? callerUserId;
  if (userId === "me") userId = callerUserId;

  const result = await assignThread(tenantId, threadId, userId, callerUserId, callerRole);
  if (!result.ok) return httpForAssignmentFailure(result);
  return NextResponse.json({
    success: true,
    data: { assignedTo: userId, changed: result.changed },
  });
}
