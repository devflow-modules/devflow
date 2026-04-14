/**
 * Meta Embedded Signup — troca de code por token e obtenção de WABA/phone numbers.
 * Documentação: https://developers.facebook.com/docs/whatsapp/embedded-signup/
 */

import {
  buildAssignedWhatsappBusinessAccountsUrl,
  getMetaGraphBase,
} from "./embeddedSignupGraphQueries";
import { getWhatsAppEmbeddedSignupRedirectUri } from "./whatsappEmbeddedSignupRedirectUri";

export interface EmbeddedSignupConfig {
  appId: string;
  configId: string;
  state: string;
}

export interface WhatsappPhoneNumberData {
  phoneNumberId: string;
  displayPhoneNumber: string;
  wabaId: string;
  accessToken: string;
  businessId?: string;
}

export interface EmbeddedSignupCallbackResult {
  success: boolean;
  error?: string;
  phoneNumbers?: WhatsappPhoneNumberData[];
}

function getMetaConfig(): {
  appId: string;
  appSecret: string;
  configId: string;
} {
  const appId = process.env.META_APP_ID ?? process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.META_APP_SECRET ?? process.env.FACEBOOK_APP_SECRET;
  const configId =
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID ?? process.env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID;

  if (!appId || !appSecret || !configId) {
    throw new Error(
      "META_APP_ID, META_APP_SECRET e META_EMBEDDED_SIGNUP_CONFIG_ID são obrigatórios para Embedded Signup"
    );
  }
  return { appId, appSecret, configId };
}

/**
 * Retorna config para o frontend iniciar o Embedded Signup.
 * state = tenantId (validado no callback).
 */
export function getEmbeddedSignupConfig(tenantId: string): EmbeddedSignupConfig {
  const { appId, configId } = getMetaConfig();
  return {
    appId,
    configId,
    state: tenantId,
  };
}

type AssignedWabaGraphRow = {
  id: string;
  name?: string;
  business_id?: string;
  phone_numbers?: {
    data?: Array<{
      id: string;
      display_phone_number?: string;
      verified_name?: string;
    }>;
  };
};

/**
 * Troca code por access_token e obtém WABA + phone numbers via
 * `GET /me/assigned_whatsapp_business_accounts` (token no header; não usar edge `client_whatsapp_business_accounts`).
 */
export async function exchangeCodeAndFetchPhoneNumbers(
  code: string
): Promise<WhatsappPhoneNumberData[]> {
  const { appId, appSecret } = getMetaConfig();
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
  console.info("[WHATSAPP][EmbeddedSignup] oauth/access_token GET", tokenUrlForLog.toString());

  const tokenRes = await fetch(tokenUrl.toString(), { method: "GET" });

  const tokenRaw = await tokenRes.text();
  console.info(
    "[WHATSAPP][EmbeddedSignup] oauth/access_token response",
    JSON.stringify({ status: tokenRes.status, body: tokenRaw.slice(0, 4000) })
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

  const wabaListUrl = buildAssignedWhatsappBusinessAccountsUrl(graphBase);
  console.info("[WHATSAPP][EmbeddedSignup] assigned_whatsapp_business_accounts GET", wabaListUrl);

  const wabasRes = await fetch(wabaListUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const wabaRaw = await wabasRes.text();
  console.info(
    "[WHATSAPP][EmbeddedSignup] assigned_whatsapp_business_accounts response",
    JSON.stringify({ status: wabasRes.status, body: wabaRaw.slice(0, 8000) })
  );

  if (!wabasRes.ok) {
    console.error("[WHATSAPP][EmbeddedSignup] WABA fetch failed:", wabaRaw);
    throw new Error(`Falha ao buscar WABA: ${wabaRaw}`);
  }

  let wabaData: { data?: AssignedWabaGraphRow[]; error?: { message?: string } };
  try {
    wabaData = JSON.parse(wabaRaw) as {
      data?: AssignedWabaGraphRow[];
      error?: { message?: string };
    };
  } catch {
    throw new Error("Resposta inválida ao listar WABAs");
  }

  if (wabaData.error?.message) {
    throw new Error(wabaData.error.message);
  }

  const accounts = wabaData.data ?? [];
  const result: WhatsappPhoneNumberData[] = [];

  for (const waba of accounts) {
    const phones = waba.phone_numbers?.data ?? [];
    for (const p of phones) {
      if (p.id) {
        result.push({
          phoneNumberId: p.id,
          displayPhoneNumber: p.display_phone_number ?? p.id,
          wabaId: waba.id,
          accessToken,
          businessId: waba.business_id,
        });
      }
    }
  }

  if (result.length === 0) {
    throw new Error("Nenhum número WhatsApp encontrado na conta. Conecte um número no Meta Business Suite.");
  }

  return result;
}
