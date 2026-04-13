import { NextRequest } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_OPERATIONAL } from "@/modules/auth";
import { getInboxOperationalMetrics } from "@/modules/inbox/inboxMetricsService";
import { jsonSuccess, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_OPERATIONAL, request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get("days") ?? "30");
    const metrics = await getInboxOperationalMetrics(auth!.payload.tenantId, {
      periodDays: Number.isFinite(days) ? days : 30,
    });
    return jsonSuccess(metrics);
  } catch (e) {
    console.error("[api/inbox/metrics GET]", e);
    return jsonError("metrics_failed", "Não foi possível carregar métricas da inbox.", 500);
  }
}
