/**
 * URI de redirecionamento OAuth do Meta Embedded Signup.
 * Deve ser idêntica no diálogo OAuth e na troca `code` → `access_token` (Graph).
 * Sem barra final. Não usar outro domínio como fallback (ex.: evitar misturar com NEXT_PUBLIC_APP_URL).
 *
 * @see https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow
 */

const PRODUCTION_WHATSAPP_EMBEDDED_SIGNUP_REDIRECT_URI =
  "https://whatsapp.devflowlabs.com.br/dashboard/whatsapp/callback";

/**
 * Retorna a redirect_uri normalizada (sem `/` final).
 * Prioridade: `WHATSAPP_OAUTH_REDIRECT_URI` no ambiente; senão URL de produção do app WhatsApp.
 * Em desenvolvimento local, defina `WHATSAPP_OAUTH_REDIRECT_URI=http://localhost:3000/dashboard/whatsapp/callback`
 * e registe a mesma URL nas definições da app Meta.
 */
export function getWhatsAppEmbeddedSignupRedirectUri(): string {
  const raw = process.env.WHATSAPP_OAUTH_REDIRECT_URI?.trim();
  if (raw) {
    return raw.replace(/\/+$/, "");
  }
  return PRODUCTION_WHATSAPP_EMBEDDED_SIGNUP_REDIRECT_URI;
}
