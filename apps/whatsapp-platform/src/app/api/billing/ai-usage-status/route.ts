import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getAiUsageStatus } from "@/modules/billing/aiUsageLimitService";
import { getAiOverageBilledInPeriod } from "@/modules/billing/aiOverageVisibilityService";
import { periodYYYYMM } from "@/modules/ai/aiUsageService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  const period = request.nextUrl.searchParams.get("period") ?? undefined;
  const p = period ?? periodYYYYMM();
  const [status, overage] = await Promise.all([
    getAiUsageStatus(auth.payload.tenantId, period),
    getAiOverageBilledInPeriod(auth.payload.tenantId, p),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      used: status.used,
      limit: status.limit,
      percent_used: status.percentUsed,
      can_use: status.canUse,
      should_fallback_to_legacy: status.shouldFallbackToLegacy,
      period: status.period,
      plan: status.plan,
      ai_overage_billed: overage.aiOverageBilled,
      ai_overage_cost_brl: overage.aiOverageCostBrl,
    },
  });
}
