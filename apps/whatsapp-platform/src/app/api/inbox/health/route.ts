import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { getWaInboxHealthForTenant } from "@/modules/inbox";
import { prisma } from "@/lib/prisma";
import { getUsageByPeriod, periodYYYYMM } from "@/modules/billing/usageService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = auth.payload.tenantId;
  const [health, usagePeriod, lastUsage] = await Promise.all([
    getWaInboxHealthForTenant(tenantId),
    getUsageByPeriod(tenantId, periodYYYYMM()),
    prisma.usageEvent.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, type: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      ...health,
      webhookProcessingOk: true,
      billingUsage: {
        period: usagePeriod.period,
        messagesSentThisPeriod: usagePeriod.messagesSent,
        aiResponsesThisPeriod: usagePeriod.aiResponses,
        lastUsageEventAt: lastUsage?.createdAt.toISOString() ?? null,
        lastUsageType: lastUsage?.type ?? null,
      },
    },
  });
}
