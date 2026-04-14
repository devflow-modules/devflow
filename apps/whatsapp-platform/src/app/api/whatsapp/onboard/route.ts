/**
 * POST /api/whatsapp/onboard
 * Retorna config para o frontend iniciar o Meta Embedded Signup.
 * Requer autenticação; usa tenantId do usuário logado.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, requireRole, ROLES_MANAGER_PLUS } from "@/modules/auth";
import { getEmbeddedSignupConfig } from "@/modules/whatsapp/embeddedSignupService";
import { EMBEDDED_SIGNUP_OAUTH_SCOPES } from "@/modules/whatsapp/embeddedSignupOAuthScopes";
import { getWhatsAppEmbeddedSignupRedirectUri } from "@/modules/whatsapp/whatsappEmbeddedSignupRedirectUri";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  const denied = requireRole(auth, ROLES_MANAGER_PLUS, request);
  if (denied) return denied;

  const tenantId = auth!.payload.tenantId;
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: "Tenant não identificado" },
      { status: 400 }
    );
  }

  try {
    const config = getEmbeddedSignupConfig(tenantId);
    const redirectUri = getWhatsAppEmbeddedSignupRedirectUri();
    const apiVer =
      process.env.META_API_VERSION ?? process.env.WHATSAPP_API_VERSION ?? "v21.0";
    const v = apiVer.startsWith("v") ? apiVer : `v${apiVer}`;
    const oauth = new URL(`https://www.facebook.com/${v}/dialog/oauth`);
    oauth.searchParams.set("client_id", config.appId);
    oauth.searchParams.set("config_id", config.configId);
    oauth.searchParams.set("response_type", "code");
    oauth.searchParams.set("state", config.state);
    oauth.searchParams.set("redirect_uri", redirectUri);
    oauth.searchParams.set("scope", EMBEDDED_SIGNUP_OAUTH_SCOPES);
    const oauthUrl = oauth.toString();
    console.info(
      `[WHATSAPP] onboard start tenant=${tenantId} redirect_uri=${redirectUri} embedded_signup_scopes=${EMBEDDED_SIGNUP_OAUTH_SCOPES}`
    );
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
