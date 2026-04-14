/**
 * Troca exclusiva `code` → `access_token` (OAuth) para Embedded Signup.
 * Usa apenas `client_id` / `client_secret` / `redirect_uri` do app — **nunca** `WHATSAPP_ACCESS_TOKEN` nem token de System User.
 */

import type { EmbeddedSignupUserAccessToken } from "./embeddedSignupUserAccessToken";
import { getEmbeddedSignupMetaAppConfig } from "./embeddedSignupMetaEnv";
import { maskAccessTokenForLog } from "./embeddedSignupLogRedact";
import { getWhatsAppEmbeddedSignupRedirectUri } from "./whatsappEmbeddedSignupRedirectUri";
import { getMetaGraphBase } from "./embeddedSignupGraphQueries";

function toEmbeddedSignupUserAccessToken(raw: string): EmbeddedSignupUserAccessToken {
  const t = raw.trim();
  if (!t) {
    throw new Error("access_token vazio na resposta OAuth — não é possível continuar o Embedded Signup");
  }
  return t as EmbeddedSignupUserAccessToken;
}

/**
 * Chama `GET /debug_token` (input_token = token do utilizador; access_token = app_id|app_secret)
 * para registar app_id, type e scopes — equivalente ao Access Token Debugger, sem logar o token completo.
 * Falhas são ignoradas (não bloqueiam onboarding); útil só para diagnóstico.
 */
async function logOAuthTokenDebugSnapshot(args: {
  graphBase: string;
  userAccessTokenPlain: string;
  appId: string;
  appSecret: string;
  expectedAppId: string;
}): Promise<void> {
  const { graphBase, userAccessTokenPlain, appId, appSecret, expectedAppId } = args;
  const debugUrl = new URL(`${graphBase}/debug_token`);
  debugUrl.searchParams.set("input_token", userAccessTokenPlain);
  debugUrl.searchParams.set("access_token", `${appId}|${appSecret}`);

  try {
    const res = await fetch(debugUrl.toString(), { method: "GET" });
    const raw = await res.text();
    type DebugPayload = {
      data?: {
        app_id?: string;
        type?: string;
        scopes?: string[];
        is_valid?: boolean;
        user_id?: string;
      };
      error?: { message?: string };
    };
    let parsed: DebugPayload;
    try {
      parsed = JSON.parse(raw) as DebugPayload;
    } catch {
      console.warn(
        "[WHATSAPP][EmbeddedSignup]",
        JSON.stringify({
          stage: "oauth_token_debug_snapshot",
          error: "invalid_json",
          bodyPreview: raw.slice(0, 800),
        })
      );
      return;
    }

    if (parsed.error?.message) {
      console.warn(
        "[WHATSAPP][EmbeddedSignup]",
        JSON.stringify({
          stage: "oauth_token_debug_snapshot",
          tokenFingerprint: maskAccessTokenForLog(userAccessTokenPlain),
          graphError: parsed.error,
          httpStatus: res.status,
        })
      );
      return;
    }

    const d = parsed.data;
    const scopes = d?.scopes ?? [];
    const hasBusinessManagement = scopes.includes("business_management");

    console.info(
      "[WHATSAPP][EmbeddedSignup]",
      JSON.stringify({
        stage: "oauth_token_debug_snapshot",
        tokenFingerprint: maskAccessTokenForLog(userAccessTokenPlain),
        expected_app_id_from_env: expectedAppId,
        debug: {
          app_id: d?.app_id ?? null,
          app_id_matches_env: d?.app_id === expectedAppId,
          type: d?.type ?? null,
          scopes,
          is_valid: d?.is_valid ?? null,
          user_id: d?.user_id ?? null,
        },
        httpStatus: res.status,
      })
    );

    if (!hasBusinessManagement) {
      console.warn(
        "[WHATSAPP][EmbeddedSignup]",
        JSON.stringify({
          stage: "oauth_token_debug_snapshot",
          warning:
            "Token sem scope business_management — /me/assigned_whatsapp_business_accounts pode falhar (ex. código 10, subcode 1752203). Inclua business_management na configuração Facebook Login for Business ligada ao config_id; o dialog OAuth do backend já envia scope com business_management (embeddedSignupOAuthScopes). Refaça o fluxo OAuth.",
          scopes,
        })
      );
    }
  } catch (e) {
    console.warn(
      "[WHATSAPP][EmbeddedSignup] oauth_token_debug_snapshot request failed",
      e instanceof Error ? e.message : e
    );
  }
}

/**
 * Executa `GET /oauth/access_token` e devolve o token de **utilizador** a usar nas chamadas Graph `/me/...` do onboarding.
 */
export async function getEmbeddedSignupUserAccessTokenFromCode(
  code: string
): Promise<{ userAccessToken: EmbeddedSignupUserAccessToken; appId: string; configId: string }> {
  const { appId, appSecret, configId } = getEmbeddedSignupMetaAppConfig();
  const redirectUri = getWhatsAppEmbeddedSignupRedirectUri();
  const graphBase = getMetaGraphBase();

  const tokenUrl = new URL(`${graphBase}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("code", code);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);

  const tokenUrlForLog = new URL(tokenUrl.toString());
  tokenUrlForLog.searchParams.set("client_secret", "***");
  tokenUrlForLog.searchParams.set("code", "***");

  console.info(
    "[WHATSAPP][EmbeddedSignup]",
    JSON.stringify({
      stage: "oauth_token_exchange",
      tokenSource: "oauth_user_token",
      endpoint: tokenUrlForLog.toString(),
    })
  );

  const tokenRes = await fetch(tokenUrl.toString(), { method: "GET" });
  const tokenRaw = await tokenRes.text();

  console.info(
    "[WHATSAPP][EmbeddedSignup]",
    JSON.stringify({
      stage: "oauth_token_exchange",
      tokenSource: "oauth_user_token",
      httpStatus: tokenRes.status,
      bodyPreview: tokenRaw.slice(0, 4000),
    })
  );

  if (!tokenRes.ok) {
    console.error("[WHATSAPP][EmbeddedSignup] token exchange failed:", tokenRaw);
    throw new Error(`Falha ao trocar code por token: ${tokenRaw}`);
  }

  let tokenData: { access_token?: string; error?: { message?: string } };
  try {
    tokenData = JSON.parse(tokenRaw) as { access_token?: string; error?: { message?: string } };
  } catch {
    throw new Error("Resposta inválida ao trocar code por token");
  }

  if (tokenData.error?.message) {
    throw new Error(tokenData.error.message);
  }
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    throw new Error("Token não retornado pela Meta");
  }

  const userAccessToken = toEmbeddedSignupUserAccessToken(accessToken);

  console.info(
    "[WHATSAPP][EmbeddedSignup]",
    JSON.stringify({
      stage: "oauth_token_exchange",
      tokenSource: "oauth_user_token",
      tokenFingerprint: maskAccessTokenForLog(accessToken),
      embedded_signup_config_id_masked:
        configId.length > 8 ? `${configId.slice(0, 4)}…${configId.slice(-4)}` : "***",
      message: "Token OAuth obtido; próximo passo usa APENAS este token para /me/assigned_whatsapp_business_accounts (não env/system).",
    })
  );

  await logOAuthTokenDebugSnapshot({
    graphBase,
    userAccessTokenPlain: accessToken,
    appId,
    appSecret,
    expectedAppId: appId,
  });

  return { userAccessToken, appId, configId };
}
