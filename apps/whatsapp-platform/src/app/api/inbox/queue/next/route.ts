import { NextRequest } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_OPERATIONAL } from "@/modules/auth";
import { runQueueNext } from "@/modules/inbox/inboxQueueNext";
import { jsonSuccess, jsonError } from "@/lib/api-response";
import { requireFeatureOr403 } from "@/modules/billing/featureGate";

export const dynamic = "force-dynamic";

/**
 * GET /api/inbox/queue/next
 * Próxima thread sem responsável; com assign=true (default) faz claim CAS ao utilizador.
 * Se o claim falhar (ex.: outro operador venceu), responde 409 sem devolver a thread.
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
      role: auth!.payload.role,
      assign,
      logSource: "inbox",
    });

    if (!result.ok) {
      const status =
        result.reason === "forbidden"
          ? 403
          : result.reason === "not_found" || result.reason === "target_not_found"
            ? 404
            : 409;
      const code =
        result.reason === "conflict"
          ? "queue_next_assign_conflict"
          : `queue_next_assign_${result.reason}`;
      return jsonError(code, result.message, status);
    }

    // Envelope compatível com clientes existentes (sem campo `ok` no data).
    if (result.thread === null) {
      return jsonSuccess({
        thread: null,
        message: result.message,
        priority: result.priority,
        queuedAt: result.queuedAt,
      });
    }
    return jsonSuccess({
      thread: result.thread,
      priority: result.priority,
      queuedAt: result.queuedAt,
    });
  } catch (e) {
    console.error("[api/inbox/queue/next GET]", e);
    return jsonError("queue_next_failed", "Não foi possível obter a próxima conversa.", 500);
  }
}
