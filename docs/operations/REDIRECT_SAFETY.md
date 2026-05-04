# Redirect safety — portal e WhatsApp Platform

Padrão comum: evitar **open redirect** e fugas de host ao construir URLs de retoma (`next`, `redirectTo`, links para apps canónicos).

## O que evitar

- **Não** concatenar manualmente `` `/login?next=${encodeURIComponent(...)}` `` nem equivalentes sem passar por um helper aprovado. Duplica lógica e facilita regressões.
- **Não** passar valores de `URLSearchParams`, cookies ou JSON de API directamente a `router.push`, `redirect`, `window.location.href` ou `href` sem validação quando o destino pode ser influenciado pelo cliente ou por respostas mutáveis.

## Helpers aprovados (usar estes)

| Contexto | Ficheiro | Funções típicas |
|----------|----------|------------------|
| App WhatsApp (paths relativos `/login`, pós-login) | `apps/whatsapp-platform/src/lib/safe-redirect.ts` | `isSafeInternalNextPath`, `loginUrlWithNext`, `resolveSignupClientNavigationHref` (signup / Stripe) |
| Portal → login no app WhatsApp (URL absoluta ou relativa via `whatsappAppUrl`) | `src/lib/portal-whatsapp-login-url.ts` | `isSafePortalNextPathForWhatsappLogin`, `whatsappAppLoginUrlWithNext` |
| Hrefs para o app Financeiro (evitar `//host` e scheme embutido) | `src/lib/financeiro-app-href.ts` | `financeiroAppHref` (validação de pathname seguro antes de `new URL`) |

Cutover e redirects 308 entre portal e apps mantêm-se nos pacotes `@devflow/whatsapp-routes` e `@devflow/financeiro-routes`; este documento foca **login `next`** e **hrefs para apps**.

## Valores `next` / path que devem ser rejeitados

- URLs **absolutas** (`https://…`, `http://…`).
- URLs **protocol-relative** (`//evil.com/…`).
- **Encoding** que após `decodeURIComponent` no pathname revela `//` ou outro bypass (ex. `/%2F%2F…`).
- **Backslashes** ou bytes nulos no path.
- Primeiro segmento de pathname com **dois-pontos** “tipo scheme” (ex. `/http://…`), incl. variantes que confundem parsers.

## Comportamento de fallback

- Se `next` (ou path candidato) for **inseguro**, o destino deve ser **`/login` sem query `next`** (no app WhatsApp: via `loginUrlWithNext` / `whatsappAppLoginUrlWithNext` isso corresponde a não acrescentar `?next=`).
- O utilizador autentica-se e segue o **default** da app (ex. `resolvePostLoginRedirect`), em vez de um destino não confiável.

## Redirects externos (outro host)

- Só com **allowlist explícita** de host/path (ex.: checkout Stripe: `https://checkout.stripe.com` em `resolveSignupClientNavigationHref`).
- Não generalizar “qualquer `https://`” da API para `window.location`.

## Testes

- Vitest: `apps/whatsapp-platform/src/lib/__tests__/safe-redirect.test.ts`, `src/lib/__tests__/portal-whatsapp-login-url.test.ts`, e testes de `financeiro-app-href` no portal onde existirem.
