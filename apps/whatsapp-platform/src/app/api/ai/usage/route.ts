import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { getAiUsageMetrics } from "@/modules/ai/aiUsageService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const period = request.nextUrl.searchParams.get("period") ?? undefined;
  const metrics = await getAiUsageMetrics(auth!.payload.tenantId, period);

  return NextResponse.json({
    success: true,
    data: {
      messages_total: metrics.messagesTotal,
      ai_messages_total: metrics.aiMessagesTotal,
      fallback_total: metrics.fallbackTotal,
      tokens_used_total: metrics.tokensUsedTotal,
      estimated_cost_usd: metrics.estimatedCostUsd,
    },
  });
}
