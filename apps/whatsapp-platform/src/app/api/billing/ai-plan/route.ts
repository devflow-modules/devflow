import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { getAiPlanInfo } from "@/modules/billing/aiUsageLimitService";
import {
  billingWriteForbiddenResponse,
  logBillingInternal,
  sanitizeAiPlanPayload,
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

  const rawPlan = await getAiPlanInfo(auth.payload.tenantId);
  const payload = {
    plan: rawPlan.plan,
    plan_name: rawPlan.planName,
    ai_limit: rawPlan.aiLimit,
    ai_limit_label: rawPlan.aiLimitLabel,
  };
  logBillingInternal("GET /api/billing/ai-plan", auth.payload.tenantId, payload);
  const data = sanitizeAiPlanPayload(payload, auth.payload);

  return NextResponse.json({
    success: true,
    data,
  });
}
