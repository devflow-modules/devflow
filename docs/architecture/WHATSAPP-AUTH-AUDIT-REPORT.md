# WhatsApp Platform — relatório de auditoria (auth, permissões, navegação)

**Tipo:** auditoria + correções mínimas. **Data:** abril 2026. **App:** `apps/whatsapp-platform`.

## 1. Superfícies inventariadas

### Páginas

- **Públicas:** `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/onboarding`, `/admin/login`.
- **Tenant (shell protegido no Edge):** `/dashboard`, `/dashboard/whatsapp`, `/dashboard/billing`, `/inbox`, `/automation`, `/billing`, `/conversations`, `/agents`, `/queues`, `/settings/*`, `/settings/ai-analytics`, etc.
- **Admin (JWT ou bypass segredo):** `/admin/metrics`, `/admin/billing`, `/admin/agents`, `/admin/conversations`, `/admin/conversations/[id]`, `/admin/distribuir`.

### APIs (grupos)

- **Auth:** `/api/auth/*` (login, logout, verify, signup, forgot-password, reset-password).
- **Staff inbox/admin:** `/api/admin/conversations*`, `/api/admin/queues`, `/api/admin/queue/next`, atribuição, mensagens, export, etc.
- **Dashboard:** `/api/dashboard/conversations`.
- **Ops:** `/api/ops/metrics` (protegido por header + env — ver secção 11).
- **Outros:** billing, Stripe, webhooks, inbox app — não reauditados ficheiro a ficheiro neste sprint; política existente mantida.

## 2. Bugs encontrados e estado

| # | Problema | Severidade | Estado |
|---|-----------|------------|--------|
| B1 | Middleware não protegia rotas principais do shell (`/dashboard`, `/automation`, …) | Alta | **Corrigido** |
| B2 | `GET /api/admin/conversations` e variantes usavam primeiro tenant sem JWT | Crítica | **Corrigido** |
| B3 | `GET /api/dashboard/conversations` idem | Alta | **Corrigido** |
| B4 | Sem token em `/admin/conversations`, redirect para `/admin/login` em vez de login JWT | Alta | **Corrigido** |
| B5 | `next` aceitava `//host` (open redirect) | Média | **Corrigido** |
| B6 | `GET /api/admin/queues` só `admin` vs `queue/next` para qualquer staff | Média | **Corrigido** (`STAFF_ROLES`) |
| B7 | Link “Admin” na sidebar para todos; agente podia abrir métricas com JWT | Média | **Corrigido** (UI + SSR) |
| B8 | Páginas `/admin/metrics`, `/admin/billing`, `/admin/agents` sem verificação de papel no servidor | Alta | **Corrigido** (guards SSR) |
| B9 | `GET /api/ops/metrics` público | Alta | **Corrigido** (ver §11) |

## 3. Navegação e relações entre ecrãs

- **Sidebar:** alinhada com `nav-config.ts`; áreas tenant cobertas pelo middleware.
- **Admin:** entrada “Admin” só para `role === admin`; agentes vêem “Distribuir” → `/admin/distribuir`.
- **Redirects:** sessão inválida limpa cookie JWT e envia para `/login?next=...` nas áreas tenant e na maioria do `/admin/*`.

## 4. Sessão e persistência (resumo)

| Fluxo | Comportamento esperado após correções |
|-------|----------------------------------------|
| Login / verify / logout | Inalterado na lógica central; `next` mais seguro. |
| Refresh / URL direta | Edge bloqueia shell sem sessão válida. |
| Sessão revogada/expirada | `verify` falha → redirect + apagar cookie. |
| `/admin/*` sem JWT | Redirect coerente com fluxo (login JWT ou `/admin/login` só quando aplicável ao bypass de métricas). |

## 5. Permissões UI vs backend

- **Conversas admin + fila:** backend exige JWT + `STAFF_ROLES`; dados filtrados por `tenantId` da sessão.
- **Métricas/billing admin:** SSR exige admin JWT **ou** bypass de segredo (produção), alinhado ao middleware.
- **Gestão de agentes (`/admin/agents`):** só `admin` no servidor.

## 6. Erros HTTP e mensagens

- Padrão mantido: `401` “Não autorizado”, `403` “Acesso negado” (`requireRole`).
- **`/api/ops/metrics`:** `401` sem/fora header quando o secret está definido; `503` em produção sem secret; ver secção 11.
- **429** em `forgot-password`: “Muitas tentativas. Tente novamente em alguns minutos.” (com `Retry-After` quando aplicável).
- Reset password e outros textos específicos: ver testes e rotas em `src/app/api/auth/*`.

## 7. Middleware e guards

- **Edge:** `middleware.ts` — paths tenant expandidos; admin sem token redireciona para login com `next`; cookie de segredo centralizado em `auth-config`.
- **SSR:** `admin-page-guard.ts` — `requireAdminOrMetricsSecretPage`, `requireJwtAdminPage`.
- **APIs:** `getAuthFromRequest` + `requireRole` + `STAFF_ROLES` onde aplicável.

## 8. Ações por área (validação lógica)

| Área | Auth | Notas |
|------|------|-------|
| Dashboard | Edge + APIs com tenant da sessão | `dashboard/conversations` corrigido |
| Inbox | Edge | APIs inbox mantidas fora deste diff |
| Automation | Edge | — |
| Billing (tenant) | Edge | — |
| Settings | Edge | — |
| Admin conversas / distribuir | Edge + `STAFF_ROLES` nas APIs | — |
| Admin métricas / billing / agentes | Edge + SSR guard | — |

## 9. Ficheiros alterados / criados

- `src/middleware.ts` — cobertura e redirects.
- `src/lib/auth-config.ts` — `ADMIN_METRICS_SECRET_COOKIE_NAME`.
- `src/lib/safe-redirect.ts` — **novo** (`resolveLoginRedirect`, `isSafeInternalNextPath`).
- `src/lib/admin-page-guard.ts` — **novo**.
- `src/modules/auth/verifyToken.ts` — `STAFF_ROLES`.
- `src/modules/auth/index.ts` — export.
- `src/app/login/LoginForm.tsx` — redirect seguro.
- `src/components/shell/AppSidebar.tsx` — links por papel.
- `src/app/api/admin/conversations/route.ts` e sub-rotas relacionadas — auth + tenant.
- `src/app/api/admin/conversations/search/route.ts` — `STAFF_ROLES`.
- `src/app/api/dashboard/conversations/route.ts` — auth + tenant.
- `src/app/api/admin/queues/route.ts`, `queue/next/route.ts` — `STAFF_ROLES`.
- `src/app/api/admin/login/route.ts` — nome do cookie centralizado.
- `src/app/admin/metrics/page.tsx`, `admin/billing/page.tsx`, `admin/agents/page.tsx` — guards.
- `src/app/api/admin/conversations/__tests__/route.test.ts`, `queue/next/__tests__/route.test.ts` — mocks atualizados.
- `src/lib/ops-metrics-guard.ts`, `src/app/api/ops/metrics/route.ts`, `__tests__/route.test.ts` — proteção Ops metrics.
- `apps/ops/src/app/actions.ts`, `apps/ops/.env.example` — header para WhatsApp Platform.
- `docs/architecture/WHATSAPP-AUTH-VALIDATION.md`, `WHATSAPP-AUTH-SMOKE-CHECKLIST.md`, `docs/shared/OPS_METRICS_CONTRACT.md`.

## 10. Estado final por área

| Área | Estado |
|------|--------|
| Edge vs shell tenant | **OK** (rotas principais cobertas) |
| APIs conversas / dashboard | **OK** (sem vazamento cross-tenant por “primeiro tenant”) |
| Fila / distribuição | **OK** (política staff alinhada) |
| Admin métricas / billing / agentes | **OK** (SSR + bypass segredo onde previsto) |
| Login `next` | **OK** (sem open redirect óbvio) |
| Sidebar | **OK** (admin vs agente) |
| Ops metrics (`/api/ops/metrics`) | **OK** (header + env; prod sem env → 503) |

## 11. Proteção `GET /api/ops/metrics` (encerramento)

- **Mecanismo:** variável `WHATSAPP_OPS_METRICS_SECRET` no app; pedidos devem enviar header **`X-Ops-Metrics-Key`** com o mesmo valor.
- **401** `{ error: "Não autorizado" }` — secret configurado mas header em falta ou incorreto.
- **503** `{ error: "Métricas ops não configuradas no servidor" }` — `NODE_ENV=production` e secret não definido (deploy incompleto).
- **Desenvolvimento** sem secret: endpoint continua acessível sem header (DX); com secret, exige header.
- **Agregador:** `apps/ops` define `OPS_WHATSAPP_METRICS_KEY` (igual ao secret) ao fazer `fetch` da URL WhatsApp.

## 12. Riscos adiados / follow-up

1. **Outras rotas `/api/*`:** não foram todas revalidadas; convém passo incremental (billing, Stripe, webhooks).
2. **403 vs redirect em páginas:** agente em `/admin/agents` → `/dashboard` sem query de motivo — aceitável; pode evoluir para `?denied=1`.
3. **Rate limiting:** apenas `forgot-password` documentado neste âmbito; outras rotas por avaliar.

## 13. Critérios de aceite (checklist)

- [x] Sem shell tenant acessível sem sessão válida (com `JWT_SECRET` definido).
- [x] Sem APIs de conversas/dashboard com dados de tenant errado por omissão.
- [x] Ações admin sensíveis (métricas, billing SSR, agentes) não apenas “escondidas na UI”.
- [x] Sem loop óbvio: utilizador sem sessão em `/admin/conversations` vai a `/login?next=...`.
- [x] Principais ecrãs ligados via sidebar + redirects coerentes.
- [x] Erros 401/403 nas APIs staff previsíveis.
- [x] `/api/ops/metrics` não público em condições de produção corretas (secret + header ou 503 se mal configurado).

## 14. Estado final da auditoria

**Completa** — sem lacunas críticas conhecidas nos fluxos principais; riscos residuais não críticos listados na secção 12.

## 15. Testes executados (referência)

- `pnpm exec vitest run` em `src/app/api/ops/metrics/__tests__/route.test.ts` (e suites auth relacionadas quando aplicável).
- `pnpm exec tsc --noEmit` em `apps/whatsapp-platform` e `apps/ops` após alterações.
