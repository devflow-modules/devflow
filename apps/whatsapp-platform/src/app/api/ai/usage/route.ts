import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getAiUsageMetrics } from "@/modules/ai/aiUsageService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  const period = request.nextUrl.searchParams.get("period") ?? undefined;
  const metrics = await getAiUsageMetrics(auth.payload.tenantId, period);

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
