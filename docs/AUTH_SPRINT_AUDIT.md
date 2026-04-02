# Sprint Auth — Auditoria Completa

## 1. Arquivos envolvidos

### 1.1 WhatsApp Platform (JWT)

| Arquivo | Função |
|---------|--------|
| `apps/whatsapp-platform/src/modules/auth/authService.ts` | login, hashPassword, signToken, verifyToken |
| `apps/whatsapp-platform/src/modules/auth/cookies.ts` | buildSetCookieHeader, buildClearCookieHeader |
| `apps/whatsapp-platform/src/modules/auth/verifyToken.ts` | getAuthFromRequest |
| `apps/whatsapp-platform/src/modules/auth/index.ts` | exports |
| `apps/whatsapp-platform/src/lib/auth-config.ts` | JWT_COOKIE_NAME, JWT_EXPIRY_HOURS, getJwtSecret, getCookieDomain |
| `apps/whatsapp-platform/src/app/api/auth/login/route.ts` | POST login |
| `apps/whatsapp-platform/src/app/api/auth/logout/route.ts` | POST logout |
| `apps/whatsapp-platform/src/app/api/auth/signup/route.ts` | POST signup |
| `apps/whatsapp-platform/src/middleware.ts` | Protege /inbox, /settings, /billing, /admin |
| `apps/whatsapp-platform/src/app/api/admin/login/route.ts` | Login admin metrics (cookie secreto) |
| `apps/whatsapp-platform/src/app/api/admin/metrics/adminAuth.ts` | isAdminMetricsAllowed |

### 1.2 Root / Financeiro (Supabase)

| Arquivo | Função |
|---------|--------|
| `src/middleware.ts` | Delega para updateSession (Supabase) |
| `src/lib/supabase/middleware-client.ts` | Sessão Supabase + redirect da landing Financeiro autenticado (`/ferramentas/financeiro`) |
| `src/app/api/_helpers/auth.ts` | requireHouseholdMembership, requireSessionOnly |
| `apps/financeiro/src/app/api/_helpers/auth.ts` | idem |
| `packages/auth-core/src/getAuthUser.ts` | Helper genérico Supabase |

### 1.3 APIs que usam getAuthFromRequest (WhatsApp JWT)

- `/api/whatsapp/onboard`, `/api/whatsapp/onboard/callback`, `/api/whatsapp/phone-numbers`
- `/api/billing/*`, `/api/stripe/*`, `/api/ai/*`, `/api/inbox/*`, `/api/automation/*`
- `/api/tenants/me/*`, `/api/admin/*` (queue, conversations, export, feedback, agent-status)
- `/api/faq/*`, `/api/metrics/*`

### 1.4 Root (rotas WhatsApp no app raiz)

- `src/app/api/whatsapp/onboard/route.ts` — usa `@wa/modules/auth`
- `src/app/api/whatsapp/phone-numbers/route.ts` — idem
- `src/app/api/whatsapp/onboard/callback/route.ts` — idem

---

## 2. Fluxo atual real

### 2.1 Login (WhatsApp Platform)

1. Cliente POST `/api/auth/login` com `{ email, password }`
2. `authService.login()` → findUserByEmail, verifyPassword (bcrypt)
3. Se OK: signToken (jose SignJWT, 24h), buildSetCookieHeader
4. Response: `{ user }` + `Set-Cookie: whatsapp_platform_token=...`

### 2.2 Logout

1. POST `/api/auth/logout`
2. Response com `Set-Cookie` que limpa o cookie (Max-Age=0)

### 2.3 Signup

1. POST `/api/auth/signup` com `{ name, email, password, planId }`
2. Cria tenant + user (role admin) + subscription
3. signToken + Set-Cookie
4. Se plan pro: redirect para Stripe Checkout
5. Senão: redirectTo `/onboarding`

### 2.4 Middleware WhatsApp (quando app whatsapp-platform roda)

- Paths protegidos: `/inbox`, `/settings`, `/billing`, `/dashboard/billing`
- Admin: `/admin/*` exceto `/admin/login`
- Admin metrics em prod: aceita `admin_metrics_secret` cookie OU JWT
- Verifica JWT no cookie, se inválido: redirect /login + delete cookie

### 2.5 Middleware Root

- Apenas Supabase: `updateSession`
- Protege: `/ferramentas/financeiro/dashboard`, `/sources`, `/expenses`, `/rules`, `/settings`, `/onboarding`
- Se não logado → redirect `/ferramentas/financeiro/auth`

### 2.6 APIs protegidas

- Cada rota chama `getAuthFromRequest(request)` → 401 se null
- Tenant scope: `auth.payload.tenantId` usado em todas as queries

---

## 3. Problemas encontrados

### 3.1 JWT / Cookies / Sessão

| # | Problema | Severidade |
|---|----------|------------|
| 1 | **buildClearCookieHeader** usa `Max-Age=0` mas não inclui valor vazio explícito — alguns browsers podem não limpar | Média |
| 2 | Cookie `buildSetCookieHeader` não define `SameSite=Strict` para máxima segurança (usa Lax) | Baixa |
| 3 | **Falta rota GET /api/auth/verify** no whatsapp-platform — frontend não tem endpoint para checar sessão | Média |
| 4 | JWT claims: faltam `iss`, `aud` para validação adicional | Baixa |
| 5 | **Expiração 24h** — sem refresh token, usuário deslogado abruptamente | Média |

### 3.2 Middleware

| # | Problema | Severidade |
|---|----------|------------|
| 6 | **Root middleware** NÃO protege rotas WhatsApp (`/dashboard/whatsapp`, `/billing`, `/admin`) — só Supabase | Alta |
| 7 | Se app unificado (root build), o middleware do root é o único que roda; whatsapp-platform middleware não existe no root | Alta |
| 8 | `/admin/metrics` em dev: livre; em prod: aceita cookie OU header — inconsistência | Média |
| 9 | Rotas `/api/auth/login`, `/api/auth/signup` não existem no root — só em whatsapp-platform | Alta |
| 10 | `/dashboard/whatsapp` no root não está em protectedPaths do middleware | Alta |

### 3.3 Multi-tenant

| # | Problema | Severidade |
|---|----------|------------|
| 11 | APIs conferem `tenantId` em queries — OK | - |
| 12 | `admin/conversations/[id]/send` verifica `convTenantId !== auth.payload.tenantId` → 403 | OK |
| 13 | Falta validação centralizada: helper `requireTenantMatch(resourceTenantId, auth)` | Baixa |

### 3.4 Roles e permissões

| # | Problema | Severidade |
|---|----------|------------|
| 14 | Roles definidas: `admin` | `agent` (UserRole) — mas **nenhuma API verifica role** | Alta |
| 15 | Todas as rotas tratam qualquer role igual; agent poderia acessar settings/billing | Alta |
| 16 | Falta matriz de permissões e helper `requireRole(auth, ['admin'])` | Alta |
| 17 | `/api/admin/*` (queue, conversations, export) — deveria exigir admin? Hoje qualquer user autenticado acessa | Média |

### 3.5 Segurança

| # | Problema | Severidade |
|---|----------|------------|
| 18 | **Sem rate limit** em login — vulnerável a brute force | Alta |
| 19 | Mensagem de login inválido: "Credenciais inválidas" — OK (genérica) | OK |
| 20 | **Reset de senha** — não implementado | Média |
| 21 | JWT_SECRET: se vazio em prod, middleware falha — OK | OK |
| 22 | CSRF: SameSite=Lax reduz risco; forms usam JSON — aceitável | OK |
| 23 | admin/login: compara `submitted === secret` — timing attack teórico (baixo) | Baixa |

### 3.6 UX

| # | Problema | Severidade |
|---|----------|------------|
| 24 | Token expirado: redirect /login sem mensagem específica | Média |
| 25 | Falta redirect pós-login (returnUrl) | Baixa |
| 26 | Loading states em LoginForm/SignupForm — verificar | - |

### 3.7 Observabilidade

| # | Problema | Severidade |
|---|----------|------------|
| 27 | **Sem logs** em login success/fail, logout, token expired | Média |
| 28 | Sem log de role denied, tenant mismatch | Média |
| 29 | adminAuth usa apenas header; admin/login route poderia logar tentativas | Baixa |

### 3.8 Testes

| # | Problema | Severidade |
|---|----------|------------|
| 30 | authService: só hash/verify testados; **login, signToken, verifyToken sem teste** | Média |
| 31 | **Sem testes** para: rota privada sem token, token inválido, role errada, tenant mismatch | Alta |
| 32 | Sem teste de logout (cookie clear) | Média |
| 33 | Sem teste de reset de senha (não existe feature) | - |

### 3.9 Inconsistências

| # | Problema | Severidade |
|---|----------|------------|
| 34 | Root `src/lib/auth-config.ts` vs `apps/whatsapp-platform/src/lib/auth-config.ts` — duplicados | Média |
| 35 | Root build: `@/modules/auth` → apps/whatsapp-platform; root não tem api/auth — depende de onde as rotas estão | Alta |
| 36 | Investigamais tem auth próprio (login, logout, verify) — similar mas separado | Info |

---

## 4. Correções propostas

### 4.1 Prioridade alta

1. **Unificar middleware no root** para proteger rotas WhatsApp quando deploy unificado: incluir JWT check para `/inbox`, `/settings`, `/billing`, `/dashboard/whatsapp`, `/admin` (exceto admin/login).
2. **Garantir rotas api/auth** no root: copiar ou montar login, logout, signup do whatsapp-platform no root src/app/api/auth/.
3. **Implementar verificação de role** em rotas sensíveis: billing, settings, automation (admin only); inbox (admin + agent).
4. **Rate limit no login**: 5 tentativas / 15 min por IP.
5. **Testes de auth**: login válido/inválido, logout, rota sem token, token inválido, tenant mismatch.

### 4.2 Prioridade média

6. **GET /api/auth/verify** no whatsapp-platform e root.
7. **Logs** de login success/fail, logout, token expired.
8. **buildClearCookieHeader** com valor vazio explícito: `token=; Max-Age=0`.
9. **Token expirado**: query `?session_expired=1` no redirect.
10. **Helper** `requireRole(auth, roles)` e `requireTenantMatch`.

### 4.3 Prioridade baixa

11. JWT claims `iss`, `aud`.
12. Matriz de permissões em docs.
13. Reset de senha (nova feature).

---

## 5. Patch por etapa

### Etapa 1: Middleware unificado (root)

Objetivo: proteger rotas WhatsApp no root quando app é build unificado.

**Arquivo:** `src/middleware.ts`

```ts
// Combinar Supabase + JWT WhatsApp
// 1. Se path /ferramentas/financeiro/* → updateSession (Supabase)
// 2. Se path /inbox, /settings, /billing, /dashboard/billing, /admin → verify JWT
// 3. Senão → next
```

### Etapa 2: Rotas api/auth no root

Copiar para `src/app/api/auth/`:
- `login/route.ts`
- `logout/route.ts`
- `signup/route.ts` (ou manter só no whatsapp-platform se signup for só lá)

Garantir que `@/modules/auth` resolva corretamente.

### Etapa 3: GET /api/auth/verify

```ts
// GET /api/auth/verify
// Cookie → getAuthFromRequest → 200 { user } ou 401
```

### Etapa 4: Logs

Em authService.login: `console.info("[auth] login success", { userId, tenantId })`
Em login route 401: `console.warn("[auth] login failed", { email })`
Em logout: `console.info("[auth] logout", { userId })`
Em middleware token invalid: `console.warn("[auth] token invalid or expired")`

### Etapa 5: requireRole

```ts
// modules/auth/requireRole.ts
export function requireRole(auth: AuthResult, allowed: UserRole[]): boolean {
  return allowed.includes(auth.payload.role as UserRole);
}
// Uso em rotas: if (!requireRole(auth, ['admin'])) return 403
```

### Etapa 6: Rate limit login

Usar `@upstash/ratelimit` ou in-memory (dev) + Redis (prod). 5 req/15min por IP em POST /api/auth/login.

### Etapa 7: buildClearCookieHeader

```ts
value = `${JWT_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
```

### Etapa 8: Testes

- `authService.test.ts`: login success, login invalid email, login invalid password
- `auth.integration.test.ts`: POST login → 200 + Set-Cookie; POST logout → 200 + Clear-Cookie
- `route.auth.test.ts`: GET /api/inbox/conversations sem cookie → 401
- `route.auth.test.ts`: GET com token inválido → 401
- `route.tenant.test.ts`: tenant mismatch em recurso → 403

---

## 6. Checklist final

### Login / Logout / Registro
- [ ] Login com credenciais válidas retorna 200 + Set-Cookie
- [ ] Login com credenciais inválidas retorna 401, mensagem genérica
- [ ] Logout limpa cookie corretamente
- [ ] Signup cria tenant + user + token
- [ ] Rate limit ativo no login

### JWT / Cookies
- [ ] Cookie HttpOnly, Secure (prod), SameSite
- [ ] Expiração 24h
- [ ] Claims: sub, tenantId, role, email, name
- [ ] Clear cookie no logout com valor vazio + Max-Age=0

### Middleware
- [ ] Rotas protegidas: /inbox, /settings, /billing, /admin
- [ ] Redirect /login quando não autenticado
- [ ] Token inválido → delete cookie + redirect
- [ ] Admin metrics em prod: cookie OU header
- [ ] Rotas públicas: /login, /signup, /admin/login

### APIs
- [ ] Todas as APIs privadas usam getAuthFromRequest
- [ ] 401 quando sem token ou token inválido
- [ ] Tenant scope em todas as queries
- [ ] Roles verificadas onde aplicável (admin only, etc.)

### Multi-tenant
- [ ] Usuário só acessa recursos do seu tenant
- [ ] Validação em recursos com tenantId (ex: conversation, queue)
- [ ] 403 em tenant mismatch

### Segurança
- [ ] JWT_SECRET em env, nunca default
- [ ] Senha hasheada com bcrypt (10 rounds)
- [ ] Mensagens de erro genéricas
- [ ] Rate limit login

### UX
- [ ] Redirect pós-login (returnUrl ou default)
- [ ] Redirect pós-logout
- [ ] Token expirado: mensagem ou query param
- [ ] Loading states em forms

### Observabilidade
- [ ] Log login success
- [ ] Log login failed
- [ ] Log logout
- [ ] Log token invalid/expired
- [ ] Log role denied (se implementado)
- [ ] Log tenant mismatch (se implementado)

### Testes
- [ ] authService: login, hash, verify
- [ ] Login route: 200, 401
- [ ] Logout route: 200 + clear cookie
- [ ] API sem token: 401
- [ ] API token inválido: 401
- [ ] Tenant mismatch: 403
- [ ] Role check: 403 (quando implementado)

---

## Resumo executivo

**Estado atual:** Dois sistemas de auth em paralelo (Supabase para financeiro, JWT para WhatsApp). O WhatsApp Platform tem login/logout/signup, JWT em cookie, middleware e getAuthFromRequest nas APIs. Multi-tenant está bem aplicado via tenantId. Faltam: verificação de roles, rate limit, logs, rota verify, testes robustos e **middleware unificado no root** quando o deploy é unificado.

**Riscos principais:** Rotas WhatsApp desprotegidas no root; ausência de verificação de role (agent acessa admin); brute force em login; poucos testes.

**Esforço estimado:** 2–3 dias para correções de prioridade alta; +1 dia para média/baixa e testes.
