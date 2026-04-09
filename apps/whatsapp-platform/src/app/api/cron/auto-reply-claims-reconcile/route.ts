import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAutoReplyClaimReconciliationJob } from "@/modules/messaging/automaticReplyClaimReconciliationService";
import { getWaAutoReplyClaimMetricsSnapshot } from "@/modules/messaging/automaticReplyClaimInstrumentation";

export const dynamic = "force-dynamic";

/**
 * Expira claims PENDING vencidos; opcionalmente tenta repair dos últimos EXPIRED sem outbound.
 * Authorization: Bearer CRON_SECRET
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? process.env.BILLING_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const repairLimit = Math.min(
    500,
    Math.max(0, Number.parseInt(searchParams.get("repairLimit") ?? "0", 10) || 0)
  );

  const result = await runAutoReplyClaimReconciliationJob(prisma, { repairLimit });
  return NextResponse.json({
    success: true,
    expiredCount: result.expiredCount,
    repairedIds: result.repairedIds,
    metrics: getWaAutoReplyClaimMetricsSnapshot(),
  });
}
