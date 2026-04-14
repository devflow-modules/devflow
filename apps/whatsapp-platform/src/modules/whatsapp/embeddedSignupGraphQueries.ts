/**
 * Consultas Graph API pós-OAuth do Embedded Signup (WABA / números).
 * Não usar `client_whatsapp_business_accounts` (edge removido / inválido em versões atuais).
 *
 * @see https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/user/assigned-whatsapp-business-accounts-api
 */

/** Campos na lista de WABAs atribuídas ao utilizador (`/me/assigned_whatsapp_business_accounts`). */
export const EMBEDDED_SIGNUP_ASSIGNED_WABA_FIELDS =
  "id,name,business_id,phone_numbers{id,display_phone_number,verified_name}";

export function getMetaGraphBase(): string {
  const ver =
    process.env.META_API_VERSION ?? process.env.WHATSAPP_API_VERSION ?? "v21.0";
  const v = ver.startsWith("v") ? ver : `v${ver}`;
  return `https://graph.facebook.com/${v}`;
}

/**
 * URL do GET para WABAs atribuídas ao utilizador autenticado (token no header Authorization).
 * Path fixo: `.../me/assigned_whatsapp_business_accounts`.
 */
export function buildAssignedWhatsappBusinessAccountsUrl(graphBase: string): string {
  const url = new URL(`${graphBase}/me/assigned_whatsapp_business_accounts`);
  url.searchParams.set("fields", EMBEDDED_SIGNUP_ASSIGNED_WABA_FIELDS);
  url.searchParams.set("limit", "100");
  return url.toString();
}
