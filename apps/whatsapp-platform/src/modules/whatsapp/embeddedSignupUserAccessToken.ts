/**
 * Token de utilizador emitido pela Meta após `GET /oauth/access_token` no fluxo Embedded Signup (troca do `code`).
 *
 * **Não confundir** com token de System User ou com `WHATSAPP_ACCESS_TOKEN` no env — esses são operacionais
 * e não têm o contexto do utilizador que concluiu o OAuth; usá-los em `/me/...` causa erros de permissão (ex. código 10).
 *
 * Valores deste tipo só devem ser criados em {@link getEmbeddedSignupUserAccessTokenFromCode}.
 */

declare const embeddedSignupUserAccessTokenBrand: unique symbol;

export type EmbeddedSignupUserAccessToken = string & {
  readonly [embeddedSignupUserAccessTokenBrand]: true;
};
