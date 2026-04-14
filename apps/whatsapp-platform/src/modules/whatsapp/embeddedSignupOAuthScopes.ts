/**
 * Permissões pedidas no parâmetro `scope` do diálogo OAuth Embedded Signup (`/dialog/oauth` + `config_id`).
 *
 * **Não incluir** `business_management` aqui: a Meta devolve "Invalid Scopes: business_management" quando esse
 * scope é solicitado manualmente neste diálogo — permissões mais amplas de negócio vêm da configuração
 * **Facebook Login for Business** ligada ao `config_id`, não de um scope inválido na URL.
 *
 * Permissões adicionais ou tokens operacionais (ex. System User, env) pertencem a fluxos fora deste onboarding;
 * ver `operationalWhatsappAccessToken.ts` e documentação em `embedded-signup-tokens.md`.
 *
 * @see https://developers.facebook.com/docs/whatsapp/embedded-signup/
 */
export const EMBEDDED_SIGNUP_OAUTH_SCOPE_LIST = [
  "whatsapp_business_management",
  "whatsapp_business_messaging",
  "public_profile",
] as const;

/** Valor do query param `scope` (vírgulas, formato Graph). */
export const EMBEDDED_SIGNUP_OAUTH_SCOPES = EMBEDDED_SIGNUP_OAUTH_SCOPE_LIST.join(",");
