import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { waInboxProspectMetrics } from "@/modules/inbox/waInboxProspectMetrics";
import { isDevFlowProspectingEnabled } from "@/lib/devflowProspecting";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return jsonError("UNAUTHORIZED", "Não autorizado", 401);
  }
  if (!isDevFlowProspectingEnabled(auth.payload.role)) {
    return jsonError("FORBIDDEN", "Proibido", 403);
  }

  try {
    const metrics = await waInboxProspectMetrics(auth.payload.tenantId);
    return jsonSuccess(metrics);
  } catch (e) {
    console.error("[inbox] prospect-metrics failed", {
      tenantId: auth.payload.tenantId,
      error: e instanceof Error ? e.message : e,
    });
    return jsonError("PROSPECT_METRICS_FAILED", "Não foi possível carregar métricas de prospecção", 500);
  }
}
