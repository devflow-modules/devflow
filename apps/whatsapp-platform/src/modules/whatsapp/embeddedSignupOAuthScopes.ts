/**
 * Permissões pedidas no diálogo OAuth do Embedded Signup (`/dialog/oauth` junto com `config_id`).
 *
 * **`business_management`** costuma ser necessário para `GET /me/assigned_whatsapp_business_accounts`
 * (lista de WABAs atribuídas ao utilizador). Se o token sair só com `whatsapp_*` + `public_profile`,
 * esse edge pode falhar com código 10 (ex. subcode 1752203) — alinhar também na consola Meta:
 * Facebook Login for Business / configuração ligada ao mesmo `config_id`.
 *
 * @see https://developers.facebook.com/docs/whatsapp/embedded-signup/
 */
export const EMBEDDED_SIGNUP_OAUTH_SCOPE_LIST = [
  "whatsapp_business_management",
  "whatsapp_business_messaging",
  "business_management",
  "public_profile",
] as const;

/** Valor do query param `scope` (vírgulas, formato Graph). */
export const EMBEDDED_SIGNUP_OAUTH_SCOPES = EMBEDDED_SIGNUP_OAUTH_SCOPE_LIST.join(",");
