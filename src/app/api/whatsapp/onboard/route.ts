/**
 * POST /api/whatsapp/onboard
 * Retorna config para o frontend iniciar o Meta Embedded Signup.
 * Requer autenticação (JWT whatsapp-platform); usa tenantId do usuário logado.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@wa/modules/auth";
import { getEmbeddedSignupConfig } from "@wa/modules/whatsapp/embeddedSignupService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
  }

  const tenantId = auth.payload.tenantId;
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: "Tenant não identificado" },
      { status: 400 }
    );
  }

  try {
    const config = getEmbeddedSignupConfig(tenantId);
    const baseUrl =
      process.env.NEXT_PUBLIC_WHATSAPP_APP_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "https://devflowlabs.com.br";
    const redirectUri = `${baseUrl}/dashboard/whatsapp/callback`;
    const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${config.appId}&config_id=${config.configId}&response_type=code&state=${encodeURIComponent(config.state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    console.info(`[WHATSAPP] onboard start tenant=${tenantId} redirect_uri=${redirectUri}`);
    return NextResponse.json({
      success: true,
      data: {
        appId: config.appId,
        configId: config.configId,
        state: config.state,
        oauthUrl,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao obter config";
    console.error("[WHATSAPP][onboard]", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
