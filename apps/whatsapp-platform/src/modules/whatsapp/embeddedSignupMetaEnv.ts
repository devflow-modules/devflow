/**
 * Credenciais do Meta App usadas no Embedded Signup (App ID, secret, configuration id).
 * Não contém tokens de utilizador nem tokens operacionais de env.
 */

export function getEmbeddedSignupMetaAppConfig(): {
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
