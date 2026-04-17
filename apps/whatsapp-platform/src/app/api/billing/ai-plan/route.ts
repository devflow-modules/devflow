import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getAiPlanInfo } from "@/modules/billing/aiUsageLimitService";
import {
  logBillingInternal,
  sanitizeAiPlanPayload,
  shouldSanitizeBillingResponse,
} from "@/modules/billing/billingSanitizer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  const rawPlan = await getAiPlanInfo(auth.payload.tenantId);
  const payload = {
    plan: rawPlan.plan,
    plan_name: rawPlan.planName,
    ai_limit: rawPlan.aiLimit,
    ai_limit_label: rawPlan.aiLimitLabel,
  };
  if (shouldSanitizeBillingResponse(auth.payload)) {
    logBillingInternal("GET /api/billing/ai-plan", auth.payload.tenantId, payload);
  }
  const data = sanitizeAiPlanPayload(payload, auth.payload);

  return NextResponse.json({
    success: true,
    data,
  });
}
