import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { runTimeElapsedRulesBatch } from "@/modules/automation/timeElapsedRunner";

export const dynamic = "force-dynamic";

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET ?? process.env.BILLING_CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  return bearer === secret;
}

/**
 * Executa regras `TIME_ELAPSED` em lote (cron ou admin).
 * Authorization: `Bearer CRON_SECRET` ou sessão admin.
 */
export async function POST(request: NextRequest) {
  const cronOk = authorizeCron(request);
  const session = cronOk ? null : await getAuthFromRequest(request);
  if (!cronOk && (!session || session.payload.role !== "admin")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: { tenantId?: string; threadLimit?: number } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const data = await runTimeElapsedRulesBatch({
      tenantId: body.tenantId,
      threadLimit: body.threadLimit,
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[automation/run-rules]", e);
    return NextResponse.json({ error: "Erro ao executar regras" }, { status: 500 });
  }
}
