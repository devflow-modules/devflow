import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { getAiFunnelMetrics } from "@/modules/ai/aiFunnelMetricsService";
import {
  allowAiFunnelMetricsRequest,
  aiFunnelMetricsRateLimitKey,
} from "@/lib/aiFunnelRateLimit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const tenantId = auth!.payload.tenantId;
  const userId = auth!.payload.sub;

  const key = aiFunnelMetricsRateLimitKey(tenantId, userId);
  if (!allowAiFunnelMetricsRequest(key)) {
    return NextResponse.json(
      { success: false, error: "Demasiados pedidos. Tente novamente dentro de um minuto." },
      { status: 429 }
    );
  }

  const data = await getAiFunnelMetrics(tenantId);
  return NextResponse.json({ success: true, data });
}
