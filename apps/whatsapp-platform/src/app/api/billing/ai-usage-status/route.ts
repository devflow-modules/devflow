import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { getAiUsageStatus } from "@/modules/billing/aiUsageLimitService";
import { getAiOverageBilledInPeriod } from "@/modules/billing/aiOverageVisibilityService";
import { periodYYYYMM } from "@/modules/ai/aiUsageService";
import {
  billingWriteForbiddenResponse,
  logBillingInternal,
  sanitizeAiUsageStatusPayload,
  shouldSanitizeBillingResponse,
} from "@/modules/billing/billingSanitizer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }
  if (shouldSanitizeBillingResponse(auth.payload)) {
    return billingWriteForbiddenResponse();
  }

  const period = request.nextUrl.searchParams.get("period") ?? undefined;
  const p = period ?? periodYYYYMM();
  const [status, overage] = await Promise.all([
    getAiUsageStatus(auth.payload.tenantId, period),
    getAiOverageBilledInPeriod(auth.payload.tenantId, p),
  ]);

  const payload = {
    used: status.used,
    limit: status.limit,
    percent_used: status.percentUsed,
    can_use: status.canUse,
    should_fallback_to_legacy: status.shouldFallbackToLegacy,
    period: status.period,
    plan: status.plan,
    ai_overage_billed: overage.aiOverageBilled,
    ai_overage_cost_brl: overage.aiOverageCostBrl,
  };
  logBillingInternal("GET /api/billing/ai-usage-status", auth.payload.tenantId, payload);
  const data = sanitizeAiUsageStatusPayload(payload, auth.payload);

  return NextResponse.json({
    success: true,
    data,
  });
}
