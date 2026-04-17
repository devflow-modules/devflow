import { NextRequest } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_OPERATIONAL } from "@/modules/auth";
import { runQueueNext } from "@/modules/inbox/inboxQueueNext";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { requireFeatureOr403 } from "@/modules/billing/featureGate";

export const dynamic = "force-dynamic";

/**
 * GET /api/inbox/queue/next
 * Igual à rota admin: próxima thread sem responsável; com assign=true (default) atribui ao utilizador.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_OPERATIONAL, request);
  if (denied) return denied;

  const blocked = await requireFeatureOr403(auth!.payload.tenantId, "QUEUES_TAGS", auth!.payload);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(request.url);
    const assign = searchParams.get("assign") !== "false";
    const tenantId = auth!.payload.tenantId;
    const userId = auth!.payload.sub;

    const result = await runQueueNext({
      tenantId,
      userId,
      assign,
      logSource: "inbox",
    });
    return jsonSuccess(result);
  } catch (e) {
    console.error("[api/inbox/queue/next GET]", e);
    return jsonError("queue_next_failed", "Não foi possível obter a próxima conversa.", 500);
  }
}
