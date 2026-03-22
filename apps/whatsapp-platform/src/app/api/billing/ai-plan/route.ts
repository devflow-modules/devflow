import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getAiPlanInfo } from "@/modules/billing/aiUsageLimitService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  const plan = await getAiPlanInfo(auth.payload.tenantId);

  return NextResponse.json({
    success: true,
    data: {
      plan: plan.plan,
      plan_name: plan.planName,
      ai_limit: plan.aiLimit,
      ai_limit_label: plan.aiLimitLabel,
    },
  });
}
