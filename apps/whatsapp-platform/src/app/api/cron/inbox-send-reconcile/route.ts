import { NextRequest, NextResponse } from "next/server";
import { runOutboundSendReconcileJob } from "@/modules/inbox/outboundSendReconcileService";

export const dynamic = "force-dynamic";

/**
 * Reconcilia ledger SENDING/META_ACCEPTED sem chamar a Meta.
 * Authorization: Bearer CRON_SECRET
 *
 * Query: dryRun=1 | limit=1..50 | staleAfterMs=…
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
  const dryRun = searchParams.get("dryRun") === "1" || searchParams.get("dryRun") === "true";
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "50", 10) || 50)
  );
  const staleRaw = searchParams.get("staleAfterMs");
  const staleAfterMs = staleRaw
    ? Math.min(24 * 60 * 60 * 1000, Math.max(60_000, Number.parseInt(staleRaw, 10) || 0))
    : undefined;

  const counts = await runOutboundSendReconcileJob({ dryRun, limit, staleAfterMs });
  return NextResponse.json({ success: true, dryRun, counts });
}
