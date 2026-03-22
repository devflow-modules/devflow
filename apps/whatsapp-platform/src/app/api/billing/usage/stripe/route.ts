import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getStripeUsageSyncStats, periodYYYYMM } from "@/modules/billing/usageService";
import { isMeterEventsConfigured } from "@/modules/billing/infrastructure/stripeMeterClient";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  const periodParam = request.nextUrl.searchParams.get("period");
  const parsed = periodParam
    ? z.string().regex(/^\d{4}-\d{2}$/).safeParse(periodParam)
    : null;
  if (periodParam && !parsed?.success) {
    return NextResponse.json({ success: false, error: "period inválido" }, { status: 400 });
  }

  const period = parsed?.success ? parsed.data : periodYYYYMM();
  const stats = await getStripeUsageSyncStats(auth.payload.tenantId, period);

  return NextResponse.json({
    success: true,
    data: {
      period,
      meteredConfigured: isMeterEventsConfigured(),
      ...stats,
      interpretation: {
        messagesPending:
          stats.messagesTotal - stats.messagesReported,
        aiPending: stats.aiTotal - stats.aiReported,
      },
    },
  });
}
