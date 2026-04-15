import { NextRequest } from "next/server";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import { getChannelAdminDetail } from "@/modules/whatsapp/channelActivationService";
import { authorizeProvisionOrPlatformAdmin } from "../../provisionAuth";

export const dynamic = "force-dynamic";

/**
 * GET — detalhe de canal (admin): SLA, último evento.
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
    const detail = await getChannelAdminDetail(id.trim());
    if (!detail) {
      return jsonError("NOT_FOUND", "Canal não encontrado.", 404, { traceId });
    }
    return jsonSuccess(detail, { traceId });
  } catch (e) {
    console.error("[GET /api/admin/whatsapp/channels/:id]", e);
    return jsonError("DETAIL_FAILED", "Não foi possível carregar o canal.", 500, { traceId });
  }
}
