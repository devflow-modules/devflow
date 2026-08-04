import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { acknowledgeUnknownOutcome } from "@/modules/inbox/outboundSendReconcileService";

export const dynamic = "force-dynamic";

/**
 * Reconhece UNKNOWN_OUTCOME (revisão manual). Não reenvia à Meta.
 * Body opcional: { note?: string }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  let note: string | undefined;
  try {
    const body = (await request.json().catch(() => ({}))) as { note?: string };
    if (typeof body.note === "string") note = body.note;
  } catch {
    /* ignore */
  }

  const result = await acknowledgeUnknownOutcome({
    tenantId: auth!.payload.tenantId,
    id: id.trim(),
    actorUserId: auth!.payload.sub,
    note,
  });

  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : 409;
    return NextResponse.json(
      {
        success: false,
        error: {
          code: result.code,
          message:
            result.code === "NOT_FOUND"
              ? "Pedido de envio não encontrado neste tenant."
              : "Só entradas UNKNOWN_OUTCOME podem ser reconhecidas.",
        },
      },
      { status }
    );
  }

  return NextResponse.json({ success: true, data: { acknowledged: true } });
}
