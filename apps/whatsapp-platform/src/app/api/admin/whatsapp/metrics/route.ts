import { NextRequest } from "next/server";
import { jsonError, jsonSuccess, newTraceId } from "@/lib/api-response";
import { authorizeProvisionOrPlatformAdmin } from "../provisionAuth";
import { getActivationMetrics } from "@/modules/whatsapp/channelActivationService";

export const dynamic = "force-dynamic";

/**
 * GET — métricas operacionais de canais WhatsApp (plataforma).
 * Auth: Bearer secret ou JWT `platform_admin`.
 */
export async function GET(request: NextRequest) {
  const traceId = newTraceId();
  if (!(await authorizeProvisionOrPlatformAdmin(request))) {
    return jsonError("UNAUTHORIZED", "Não autorizado", 401, { traceId });
  }

  try {
    const metrics = await getActivationMetrics();
    return jsonSuccess(metrics, { traceId });
  } catch (e) {
    console.error("[GET /api/admin/whatsapp/metrics]", e);
    return jsonError("METRICS_FAILED", "Não foi possível calcular métricas.", 500, { traceId });
  }
}
