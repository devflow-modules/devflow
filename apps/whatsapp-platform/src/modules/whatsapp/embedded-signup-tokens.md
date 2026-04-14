# Tokens: Embedded Signup (onboarding) vs operação

## Onboarding / Embedded Signup

1. O browser recebe `code` e o backend chama `GET /oauth/access_token` (client_id + client_secret + redirect_uri).
2. O **access_token** devolvido é um token de **utilizador** (contexto do Facebook login / permissões OAuth).
3. Esse token é o único usado em `GET /me/assigned_whatsapp_business_accounts` para listar WABA e números.
4. Os dados são persistidos em `WhatsappPhoneNumber` (incluindo esse token como credencial da linha).

Após a troca do `code`, o backend chama `GET /debug_token` (com o mesmo token e credenciais do app) e regista nos logs **sem expor o token**: `app_id`, `type`, `scopes`, `app_id_matches_env`, `user_id`. Isto substitui a necessidade de abrir o Access Token Debugger manualmente em muitos casos.

### Scopes OAuth (`/dialog/oauth`)

O `POST /api/whatsapp/onboard` devolve `oauthUrl` com o parâmetro `scope` definido em `embeddedSignupOAuthScopes.ts`, incluindo **`business_management`** além de `whatsapp_business_management`, `whatsapp_business_messaging` e `public_profile`.

- A **configuração na Meta** (Facebook Login for Business / Embedded Signup associada ao `config_id`) deve permitir esses permissões; só o código ou só a consola não bastam se estiverem desalinhados.
- Se o log `oauth_token_debug_snapshot` mostrar o token **sem** `business_management`, o passo seguinte (`assigned_whatsapp_business_accounts`) pode falhar com permissão — ajuste a config na Meta e refaça o OAuth.

**Nunca** usar nesta fase:

- `WHATSAPP_ACCESS_TOKEN` / `META_WHATSAPP_ACCESS_TOKEN` do env
- Token de System User gerado no Business Manager
- Qualquer helper de `operationalWhatsappAccessToken.ts`

Motivo: edges como `/me/...` dependem do contexto do utilizador que concluiu o OAuth; tokens de sistema ou env não têm esse contexto e geram erros de permissão (ex.: código 10, subcode 1752203).

## Operação (SaaS)

- Envio de mensagens, webhooks e rotinas usam o token **armazenado por linha** (`WhatsappPhoneNumber.accessToken`) ou fluxos explícitos de operação.
- `getOperationalWhatsappAccessTokenFromEnv()` existe só para cenários operacionais opcionais (ex.: scripts); o fluxo de onboarding **não** o importa.

## Código

| Peça | Ficheiro |
|------|----------|
| Troca `code` → token utilizador | `embeddedSignupOAuthExchange.ts` |
| Lista WABA com token utilizador | `embeddedSignupWabaFetch.ts` |
| Tipo opaco do token OAuth | `embeddedSignupUserAccessToken.ts` |
| Env operacional (não onboarding) | `operationalWhatsappAccessToken.ts` |
| Orquestração | `embeddedSignupService.ts` |
