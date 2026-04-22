import { NextRequest } from "next/server";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import { getVerificationReadiness } from "@/modules/whatsapp/verificationService";
import { authorizeProvisionOrPlatformAdmin } from "../../../provisionAuth";

export const dynamic = "force-dynamic";

/**
 * GET — dados de verificação Meta Business (checklist, score, estado, marcas temporais).
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
    const dto = await getVerificationReadiness(id.trim());
    if (!dto) {
      return jsonError("NOT_FOUND", "Canal não encontrado.", 404, { traceId });
    }
    return jsonSuccess(dto, { traceId });
  } catch (e) {
    console.error("[GET /api/admin/whatsapp/channels/:id/verification]", e);
    return jsonError("VERIFICATION_FAILED", "Não foi possível carregar a verificação.", 500, { traceId });
  }
}
