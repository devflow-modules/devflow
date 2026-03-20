/**
 * Meta Embedded Signup — troca de code por token e obtenção de WABA/phone numbers.
 * Documentação: https://developers.facebook.com/docs/whatsapp/embedded-signup/
 */

const META_GRAPH_VERSION = "v21.0";
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

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

/**
 * Troca code por access_token e obtém WABA + phone numbers.
 */
export async function exchangeCodeAndFetchPhoneNumbers(
  code: string
): Promise<WhatsappPhoneNumberData[]> {
  const { appId, appSecret } = getMetaConfig();

  const tokenRes = await fetch(
    `${META_GRAPH_BASE}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`,
    { method: "GET" }
  );

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("[WHATSAPP][EmbeddedSignup] token exchange failed:", err);
    throw new Error(`Falha ao trocar code por token: ${err}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: { message?: string } };
  if (tokenData.error?.message) {
    throw new Error(tokenData.error.message);
  }
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    throw new Error("Token não retornado pela Meta");
  }

  const wabasRes = await fetch(
    `${META_GRAPH_BASE}/me/client_whatsapp_business_accounts?fields=id,name,account_review_status,phone_numbers{id,display_phone_number,verified_name}&access_token=${encodeURIComponent(accessToken)}`,
    { method: "GET" }
  );

  if (!wabasRes.ok) {
    const err = await wabasRes.text();
    console.error("[WHATSAPP][EmbeddedSignup] WABA fetch failed:", err);
    throw new Error(`Falha ao buscar WABA: ${err}`);
  }

  const wabaData = (await wabasRes.json()) as {
    data?: Array<{
      id: string;
      name?: string;
      phone_numbers?: { data?: Array<{ id: string; display_phone_number?: string; verified_name?: string }> };
    }>;
    error?: { message?: string };
  };

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
        });
      }
    }
  }

  if (result.length === 0) {
    throw new Error("Nenhum número WhatsApp encontrado na conta. Conecte um número no Meta Business Suite.");
  }

  return result;
}
