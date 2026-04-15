import { NextRequest } from "next/server";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import { getChannelTimeline } from "@/modules/whatsapp/channelEventService";
import { authorizeProvisionOrPlatformAdmin } from "../../../provisionAuth";

export const dynamic = "force-dynamic";

/**
 * GET — timeline de eventos do canal (mais recentes primeiro).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const traceId = newTraceId();
  if (!(await authorizeProvisionOrPlatformAdmin(request))) {
    return jsonError("UNAUTHORIZED", "Não autorizado", 401, { traceId });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return jsonError("VALIDATION_ERROR", "ID inválido.", 400, { traceId });
  }

  try {
    const events = await getChannelTimeline(id.trim());
    return jsonSuccess({ events }, { traceId });
  } catch (e) {
    console.error("[GET /api/admin/whatsapp/channels/:id/timeline]", e);
    return jsonError("TIMELINE_FAILED", "Não foi possível carregar a timeline.", 500, { traceId });
  }
}
