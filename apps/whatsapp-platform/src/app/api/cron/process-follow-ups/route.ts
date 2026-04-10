import { NextRequest, NextResponse } from "next/server";
import { processFollowUps } from "@/modules/commercial";

export const dynamic = "force-dynamic";

/**
 * Worker: executa follow-ups / reativações / recuperações agendadas.
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
  const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "25", 10) || 25));

  const result = await processFollowUps({ limit });
  return NextResponse.json({ success: true, ...result });
}
