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
      message: "Token OAuth obtido; próximo passo usa APENAS este token para /me/assigned_whatsapp_business_accounts (não env/system).",
    })
  );

  return { userAccessToken, appId, configId };
}
