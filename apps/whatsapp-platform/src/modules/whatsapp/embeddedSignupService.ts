/**
 * Meta Embedded Signup — orquestração do onboarding (OAuth utilizador → lista WABA / números).
 *
 * ## Tokens
 * - **Onboarding (este fluxo):** só o token devolvido por `GET /oauth/access_token` após o `code`.
 *   Usado em `/me/assigned_whatsapp_business_accounts`. Implementado em
 *   {@link getEmbeddedSignupUserAccessTokenFromCode} e {@link fetchWabaUsingEmbeddedSignupUserToken}.
 * - **Operação (SaaS):** tokens por linha na BD, ou env/System User via {@link operationalWhatsappAccessToken} —
 *   **nunca** misturar com o passo de listagem WABA no onboarding.
 *
 * @see docs em ./embedded-signup-tokens.md
 */

import { fetchWabaUsingEmbeddedSignupUserToken } from "./embeddedSignupWabaFetch";
import { getEmbeddedSignupMetaAppConfig } from "./embeddedSignupMetaEnv";
import { getEmbeddedSignupUserAccessTokenFromCode } from "./embeddedSignupOAuthExchange";
import type { EmbeddedSignupPhoneRow } from "./embeddedSignupWabaFetch";

export interface EmbeddedSignupConfig {
  appId: string;
  configId: string;
  state: string;
}

/** Dados de linha devolvidos após Embedded Signup (token = OAuth user até persistir na BD). */
export type WhatsappPhoneNumberData = EmbeddedSignupPhoneRow;

export interface EmbeddedSignupCallbackResult {
  success: boolean;
  error?: string;
  phoneNumbers?: WhatsappPhoneNumberData[];
}

/**
 * Retorna config para o frontend iniciar o Embedded Signup.
 * state = tenantId (validado no callback).
 */
export function getEmbeddedSignupConfig(tenantId: string): EmbeddedSignupConfig {
  const { appId, configId } = getEmbeddedSignupMetaAppConfig();
  return {
    appId,
    configId,
    state: tenantId,
  };
}

/**
 * Troca `code` por token de **utilizador** OAuth e lista WABAs/números com esse mesmo token.
 * Não há fallback para `WHATSAPP_ACCESS_TOKEN`, System User nem token global de env.
 */
export async function exchangeCodeAndFetchPhoneNumbers(
  code: string
): Promise<WhatsappPhoneNumberData[]> {
  const { userAccessToken, appId, configId } = await getEmbeddedSignupUserAccessTokenFromCode(code);
  return fetchWabaUsingEmbeddedSignupUserToken({
    userAccessToken,
    appId,
    configId,
  });
}
