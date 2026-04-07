# WhatsApp Platform — matriz de autenticação e permissões

Sprint de auditoria (abril 2026). Âmbito: `apps/whatsapp-platform`.

## Legenda

| Símbolo | Significado |
|--------|-------------|
| **Público** | Sem cookie JWT válido |
| **Sessão** | JWT + sessão DB válidos (`getAuthFromRequest` / `/api/auth/verify`) |
| **Staff** | `role ∈ { admin, agent }` (`STAFF_ROLES`) |
| **Admin** | `role === admin` |
| **Edge** | `src/middleware.ts` (validação via `/api/auth/verify`) |
| **SSR guard** | `src/lib/admin-page-guard.ts` |

## Páginas (App Router)

| Rota | Edge | SSR / notas | Papel UI |
|------|------|-------------|----------|
| `/` | — | Landing / redirecionos do produto | Público |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | — | Auth forms; `next` validado com `safe-redirect` | Público |
| `/onboarding` | — | Wizard inicial | Público |
| `/dashboard`, `/dashboard/*` | Sessão | Shell `(protected)` | Staff |
| `/inbox` | Sessão | Full-bleed | Staff |
| `/automation`, `/conversations`, `/agents`, `/queues` | Sessão | Shell | Staff |
| `/billing`, `/settings/*` | Sessão | Shell / nested layouts | Staff |
| `/admin/login` | — | Segredo métricas (POST → cookie) | Público (fluxo segredo) |
| `/admin/metrics`, `/admin/billing` | Sessão **ou** bypass segredo (prod) | `requireAdminOrMetricsSecretPage` | Admin ou segredo |
| `/admin/agents` | Sessão | `requireJwtAdminPage` | Admin |
| `/admin/conversations`, `/admin/conversations/[id]`, `/admin/distribuir` | Sessão | Sem guard SSR extra; APIs com `STAFF_ROLES` | Staff |

## APIs relevantes (amostra canónica)

| Rota | Auth | Papel |
|------|------|--------|
| `/api/auth/login`, `/api/auth/logout`, `/api/auth/verify`, forgot/reset | Variável | — |
| `/api/admin/conversations` (+ `[id]`, `messages`, `search`, `assign`, `send`, `resolve`, `export`) | JWT + sessão | `STAFF_ROLES` |
| `/api/admin/queues`, `/api/admin/queue/next` | JWT + sessão | `STAFF_ROLES` |
| `/api/dashboard/conversations` | JWT + sessão | `STAFF_ROLES` + `tenantId` da sessão |
| `/api/admin/login` (POST) | — | Define cookie de segredo se env correto |
| `/api/ops/metrics` | Header `X-Ops-Metrics-Key` se `WHATSAPP_OPS_METRICS_SECRET` definido; prod sem env → **503** | Contrato Ops; chamadas desde `apps/ops` com `OPS_WHATSAPP_METRICS_KEY` |

## Matriz papel × superfície

| Superfície | Agente | Admin |
|------------|--------|-------|
| Shell tenant (dashboard, inbox, …) | Sim (Edge + sessão) | Sim |
| Link sidebar “Admin” → `/admin/metrics` | Não (oculto) | Sim |
| Link sidebar “Distribuir” | Sim | Não (admin usa métricas; pode ir por URL) |
| `/admin/conversations`, fila, APIs staff | Sim | Sim |
| `/admin/metrics`, `/admin/billing` | Não (SSR + JWT); bypass segredo só operação | Sim / segredo |
| `/admin/agents` | Não (redirect `/dashboard`) | Sim |

## Redirects e `next`

| Cenário | Comportamento |
|---------|----------------|
| Área tenant sem token | `/login?next=<path+query>` |
| Área `/admin/*` sem token (exc. métricas/billing só segredo em prod) | `/login?next=...` |
| Métricas/billing em prod, segredo configurado, sem JWT | `/admin/login` |
| `next` no login | Só paths internos seguros (`isSafeInternalNextPath`) |

## Divergências corrigidas neste sprint

1. Edge não cobria `/dashboard`, `/automation`, `/conversations`, `/agents`, `/queues`.
2. Várias APIs admin/dashboard usavam `listTenants()[0]` sem JWT.
3. `/api/admin/queues` exigia só `admin`; UI de agente alinhada com `queue/next` → `STAFF_ROLES`.
4. Redirect de `/admin/*` sem sessão ia para `/admin/login` (segredo) em vez de `/login?next=`.
5. Open redirect parcial em `next` (`//evil.com`).
6. Páginas admin sensíveis sem verificação de papel no servidor (métricas, billing, agentes).
