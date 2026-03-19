import { NextRequest, NextResponse } from "next/server";
import { retryPendingStripeUsageReports } from "@/modules/billing/stripeMeteredService";

export const dynamic = "force-dynamic";

/**
 * Reprocessa UsageEvent ainda não reportados ao Stripe.
 * Proteger com CRON_SECRET (header Authorization: Bearer).
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

  const result = await retryPendingStripeUsageReports(100);
  return NextResponse.json({
    success: true,
    processed: result.processed,
    succeeded: result.succeeded,
  });
}
