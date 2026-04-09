import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { buildSupportPayload } from "@/modules/support/buildSupportPayload";
import { formatDebugIdForUi } from "@/modules/support/formatDebugId";
import { getSupportDiagnostics } from "@/modules/support/getSupportDiagnostics";
import { resolveDeploymentEnv } from "@/modules/support/resolveDeploymentEnv";
import { sendSupportNotification } from "@/modules/support/sendSupportNotification";
import { supportReportRequestSchema } from "@/modules/support/supportTypes";

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = supportReportRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const debugId = randomUUID();
  const diagnostics = await getSupportDiagnostics(auth.payload.tenantId);
  const pathname = parsed.data.pathname?.trim() || "/";
  const userAgent =
    parsed.data.userAgent?.trim() ||
    request.headers.get("user-agent")?.trim() ||
    "";
  const environment = resolveDeploymentEnv();

  const payload = buildSupportPayload({
    debugId,
    payload: auth.payload,
    category: parsed.data.category,
    description: parsed.data.description,
    pathname,
    userAgent,
    environment,
    capturedAtIso: new Date().toISOString(),
    diagnostics,
  });

  const sent = await sendSupportNotification(payload);
  if (!sent.ok) {
    return NextResponse.json(
      { error: "Não conseguimos enviar agora. Tente novamente em instantes." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    debugId: payload.debugId,
    debugIdDisplay: formatDebugIdForUi(payload.debugId),
  });
}
