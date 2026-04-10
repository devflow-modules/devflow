import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import {
  computeAutomationPercent,
  getAiOperationalMetrics,
} from "@/modules/ai/aiMetricsService";
import { allowAiMetricsRequest, aiMetricsRateLimitKey } from "@/lib/aiMetricsRateLimit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const tenantId = auth!.payload.tenantId;
  const userId = auth!.payload.sub;

  const key = aiMetricsRateLimitKey(tenantId, userId);
  if (!allowAiMetricsRequest(key)) {
    return NextResponse.json(
      { success: false, error: "Demasiados pedidos. Tente novamente dentro de um minuto." },
      { status: 429 }
    );
  }

  const daysParam = request.nextUrl.searchParams.get("days");
  const days = Math.min(90, Math.max(1, Number(daysParam) || 30));

  const m = await getAiOperationalMetrics(tenantId, days);
  const automationPercent = computeAutomationPercent(m);
  const fallbackPercent =
    m.totalMessages > 0 ? Math.round((m.fallbacks / m.totalMessages) * 1000) / 10 : null;
  const errorPercent =
    m.totalMessages > 0 ? Math.round((m.errors / m.totalMessages) * 1000) / 10 : null;

  return NextResponse.json({
    success: true,
    data: {
      totalMessages: m.totalMessages,
      autoReplies: m.autoReplies,
      fallbacks: m.fallbacks,
      errors: m.errors,
      blockedDecisions: m.blockedDecisions,
      avgLatency: m.avgLatencyMs,
      periodDays: m.periodDays,
      automationPercent,
      fallbackPercent,
      errorPercent,
    },
  });
}
