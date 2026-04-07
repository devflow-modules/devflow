# WhatsApp Platform — validação de auth e sessão

Documento de **readiness** antes do smoke manual. Rotas em **`apps/whatsapp-platform`**.

## Rotas API

| Rota | Método | Comportamento esperado |
|------|--------|-------------------------|
| `/api/auth/login` | POST | JSON `{ email, password }` → 200 + `Set-Cookie` JWT ou 401; **400** se o corpo não for JSON válido (`parseRequestJson`) |
| `/api/auth/verify` | GET | Cookie → **200** `{ valid: true, user }` ou **401** `{ valid: false }` |
| `/api/auth/logout` | POST | Limpa cookie; se havia sessão, regista **`logAuth({ type: "logout", ... })`** |
| `/api/auth/signup` | POST | **400** se JSON inválido (idem) |
| `/api/auth/forgot-password` | POST | Rate limit; e-mail inexistente → mesma mensagem genérica (sem vazar); **503** se SMTP falhar |
| `/api/auth/reset-password` | POST | Token inválido → **400**; senha curta → **400** (Zod) |

## UI

| Página | Notas |
|--------|--------|
| `/login` | `next` na query: só redirect se começar com `/` (evita open redirect). Default: `/dashboard/whatsapp`. Após login, `verify` em `useEffect` redireciona se já autenticado. |
| `/forgot-password` | Link a partir do formulário de login. |
| `/reset-password` | Query `token`; fluxo pós-e-mail. |

## Observabilidade

- **`logAuth`** em `src/lib/auth-logger.ts` — prefixo **`[auth]`** + JSON (sem segredos).
- Login: `login_success` / `login_failed`.
- Logout: `logout` com `userId` e `tenantId` quando aplicável.

## Testes automatizados

Vitest em `apps/whatsapp-platform`:

- `src/app/api/auth/login/__tests__/route.test.ts`
- `src/app/api/auth/verify/__tests__/route.test.ts`
- `src/app/api/auth/logout/__tests__/route.test.ts`
- `src/app/api/auth/forgot-password/__tests__/route.test.ts`
- `src/app/api/auth/reset-password/__tests__/route.test.ts`

## Smoke manual (produção)

Confirmar no domínio real do app: cookies (`HttpOnly`, path, SameSite), sem loop portal ↔ app, e `next` após login.

Ver também: [`WHATSAPP-OBSERVABILITY-MINIMUM.md`](./WHATSAPP-OBSERVABILITY-MINIMUM.md).
