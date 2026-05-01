import type { NextRequest } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { getTenantRevenueMetrics } from "@/modules/inbox/revenueMetricsService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const raw = request.nextUrl.searchParams.get("days");
  const days = Math.min(365, Math.max(1, parseInt(raw ?? "30", 10) || 30));

  try {
    const m = await getTenantRevenueMetrics(auth!.payload.tenantId, days);
    return jsonSuccess({
      totalRevenue: m.totalRevenue,
      dealsWon: m.dealsWon,
      conversionRate: m.conversionRate,
      avgTicket: m.avgTicket,
      activeThreads: m.activeThreads,
      days: m.days,
    });
  } catch (e) {
    console.error("[metrics/revenue]", e);
    return jsonError("INTERNAL", "Erro ao calcular métricas de receita", 500);
  }
}
