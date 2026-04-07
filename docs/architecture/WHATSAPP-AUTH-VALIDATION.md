# WhatsApp Platform — validação de auth e sessão

Documento de **readiness** e referência do comportamento **implementado** em **`apps/whatsapp-platform`**.

## Middleware (Edge)

- Chama internamente **`GET /api/auth/verify`** com os cookies do pedido (sem duplicar regras JWT/sessão no Edge).
- **Áreas com sessão tenant obrigatória** (JWT + sessão DB válidos): `/inbox`, `/settings`, `/billing`, `/dashboard`, `/automation`, `/conversations`, `/agents`, `/queues`.
- Sem token ou sessão inválida: redirect para **`/login?next=<pathname+query>`** e, se aplicável, remoção do cookie JWT.
- **`/admin/*`** (exc. `/admin/login`): JWT válido **ou**, em **produção** apenas para `/admin/metrics` e `/admin/billing`, cookie de segredo de métricas (alinhado a `WHATSAPP_ADMIN_METRICS_SECRET`). Sem JWT e sem bypass: redirect para `/login?next=...`, exceto quando o fluxo é só segredo → `/admin/login`.
- Sem `JWT_SECRET` em **development**: o middleware deixa passar (DX); em **production** exige configuração.

## Redirect seguro (`next`)

- Query `next` no login só é seguida se for path interno seguro (`src/lib/safe-redirect.ts`): começa com `/`, não é `//…`, sem segmentos com `:` (evita open redirect).
- **`resolveLoginRedirect`** — usado no cliente após login (fallback se `next` inválido).
- **`loginUrlWithNext`** — usado no **middleware** ao redirecionar para login: só acrescenta `?next=` quando o destino passa a mesma validação; caso contrário `/login` sem query.
- Default após login: `/dashboard/whatsapp`.

## Papel e `STAFF_ROLES`

- Roles no JWT/DB: **`admin`** | **`agent`**.
- **`STAFF_ROLES`** = `["admin", "agent"]` — usado em `requireRole` nas APIs de inbox/admin partilhadas (conversas, fila, `queue/next`, dashboard conversas, etc.).
- **`requireRole`:** sem sessão → **401** `{ error: "Não autorizado" }`; sessão com papel não permitido → **403** `{ error: "Acesso negado" }`.

## SSR — páginas admin sensíveis

- `src/lib/admin-page-guard.ts`:
  - **`requireAdminOrMetricsSecretPage`**: `/admin/metrics`, `/admin/billing` — JWT com `role === admin` **ou** bypass de segredo em produção (mesma ideia que o middleware).
  - **`requireJwtAdminPage`**: ex. `/admin/agents` — só **`admin`**; sem JWT válido → `/login?next=…`; agente → redirect `/dashboard`.

## UI (sidebar)

- Link **Admin** → `/admin/metrics` apenas se `role === admin` (após `GET /api/auth/verify`).
- Link **Distribuir** → `/admin/distribuir` para **`agent`** (admin pode usar a URL diretamente).

## Rotas API — comportamento esperado

| Rota | Método | Comportamento |
|------|--------|----------------|
| `/api/auth/login` | POST | JSON `{ email, password }` → 200 + cookie; **401** com `code: "INVALID_CREDENTIALS"` quando aplicável; **429** `code: "RATE_LIMITED"`; **400** JSON inválido; `login_failed` / `login_success` em `logAuth` (IP em falhas) |
| `/api/auth/verify` | GET | Cookie → **200** `{ valid: true, user }` ou **401** `{ valid: false }` |
| `/api/auth/logout` | POST | Limpa cookie; revoga sessão no servidor quando aplicável; `logAuth({ type: "logout", ... })` |
| `/api/auth/signup` | POST | **400** se JSON inválido; **429** `code: "RATE_LIMITED"` (rate limit dedicado a signup) |
| `/api/auth/forgot-password` | POST | **429** `code: "RATE_LIMITED"` + `Retry-After` opcional; e-mail inexistente → sucesso genérico (sem vazar); **503** se SMTP falhar |
| `/api/auth/reset-password` | POST | **400** com `code: "RESET_TOKEN_INVALID"` ou `RESET_TOKEN_EXPIRED"` + mensagens distintas; **429** `code: "RATE_LIMITED"`; Zod → **400**; sucesso → `revokeAllSessionsForUser` + logs `sessions_revoked_all` / `password_reset_success` |
| `/api/ops/metrics` | GET | Ver secção abaixo |

### `/api/ops/metrics`

- **Produção** sem `WHATSAPP_OPS_METRICS_SECRET` definido → **503** `{ error: "Métricas ops não configuradas no servidor" }`.
- Com secret definido: header obrigatório **`X-Ops-Metrics-Key`** igual ao secret; caso contrário **401** `{ error: "Não autorizado" }`.
- **Desenvolvimento** sem secret: pedido permitido (DX); com secret: mesma exigência de header que acima.
- O app **`apps/ops`** envia `OPS_WHATSAPP_METRICS_KEY` no header ao chamar a URL do WhatsApp Platform.

## Revogação e expiração de sessão

- JWT inclui `jti` ligado a `UserSession`; sessão revogada ou expirada → `validateAuthToken` falha → `/api/auth/verify` **401**; middleware redireciona para login com `next` e apaga cookie quando a verificação Edge falha.
- APIs que usam `getAuthFromRequest` retornam **401** sem sessão válida.
- **TTL cookie ↔ JWT**: `buildSetCookieHeader` usa `getAccessTokenMaxAgeSeconds()`; `signToken` usa `getAccessTokenHours()` — mesma janela (`src/lib/auth-config.ts`).

## Rate limiting (auth)

- Chaves em `src/lib/rate-limit.ts`: login, signup, forgot-password, reset-password (e outras rotas sensíveis conforme ficheiro). Respostas **429** com `code: "RATE_LIMITED"` onde aplicável.

## Observabilidade

- **`logAuth`** em `src/lib/auth-logger.ts` — prefixo **`[auth]`** + JSON (sem segredos).
- Login: `login_success` / `login_failed`; logout: `logout`; `requireRole` regista `forbidden` / `unauthorized` conforme o caso.

## Testes automatizados (Vitest)

- Auth: `src/app/api/auth/login|verify|logout|forgot-password|reset-password/__tests__/`
- Ops metrics: `src/app/api/ops/metrics/__tests__/route.test.ts`
- Outros módulos auth: `src/modules/auth/__tests__/`

## Smoke manual

Checklist compacto: [`WHATSAPP-AUTH-SMOKE-CHECKLIST.md`](./WHATSAPP-AUTH-SMOKE-CHECKLIST.md).

Produção: cookies (`HttpOnly`, path, SameSite), sem loop entre portal e app, `next` após login, e **variáveis** `WHATSAPP_OPS_METRICS_SECRET` + `OPS_WHATSAPP_METRICS_KEY` alinhadas se usar o dashboard Ops.

Ver também: [`WHATSAPP-OBSERVABILITY-MINIMUM.md`](./WHATSAPP-OBSERVABILITY-MINIMUM.md), [`WHATSAPP-AUTH-AUDIT-MATRIX.md`](./WHATSAPP-AUTH-AUDIT-MATRIX.md), [`WHATSAPP-AUTH-AUDIT-REPORT.md`](./WHATSAPP-AUTH-AUDIT-REPORT.md).
