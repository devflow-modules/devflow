/**
 * Tokens de acesso **operacionais** (Cloud API / System User / variáveis de ambiente globais).
 *
 * ## Quando usar
 * Cenários como webhook único, scripts ou integrações que não passam pelo OAuth do utilizador final.
 * O tráfego normal do produto costuma usar o token **por linha** em `WhatsappPhoneNumber.accessToken` (BD).
 *
 * ## O que NUNCA fazer
 * Não chamar {@link getOperationalWhatsappAccessTokenFromEnv} (nem qualquer token vindo só do env)
 * dentro do fluxo de **Embedded Signup** / onboarding inicial: listar WABA em `/me/assigned_whatsapp_business_accounts`
 * exige o token de **utilizador** devolvido na troca do `code`.
 *
 * @see getEmbeddedSignupUserAccessTokenFromCode em ./embeddedSignupOAuthExchange.ts
 */

/**
 * Lê token Cloud API típico de env (opcional). Ausente na maioria dos deploys multi-tenant.
 * Onboarding não deve importar este módulo.
 */
export function getOperationalWhatsappAccessTokenFromEnv(): string | undefined {
  const a = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const b = process.env.META_WHATSAPP_ACCESS_TOKEN?.trim();
  return a || b || undefined;
}
