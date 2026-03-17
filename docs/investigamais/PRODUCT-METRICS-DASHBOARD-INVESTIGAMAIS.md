# Dashboard de métricas — Investiga+

Este documento descreve o dashboard interno de métricas do produto Investiga+, alinhado ao padrão do DevFlow (`docs/DEVFLOW-METRICS-DASHBOARD.md`).

---

## 1. Descrição

- **URL:** `/admin/metrics`
- **Fonte dos dados:** Contadores em memória via `@devflow/analytics-core` (`getCounters()`) e dados de ops (usuários, consultas, cache) do Supabase.
- **Proteção:** Em produção, endpoint e página exigem segredo de admin (`ADMIN_METRICS_SECRET`); em desenvolvimento o acesso é livre.

---

## 2. Métricas exibidas

### Seção 1 — Métricas do produto (analytics-core)

- **Consultas solicitadas** — `investiga.cnpj_query_requested`
- **Cache hit** — `investiga.cnpj_cache_hit`
- **Cache miss** — `investiga.cnpj_cache_miss`
- **Consultas concluídas** — `investiga.cnpj_query_completed`
- **Login** — `investiga.user_login`
- **Logout** — `investiga.user_logout`
- **Histórico visualizado** — `investiga.history_viewed`
- **Perfil atualizado** — `investiga.profile_updated`
- **Webhook recebido** — `investiga.webhook_received`
- **Usuário criado via webhook** — `investiga.webhook_user_created`

### Seção 2 — Ops (Supabase)

- **Usuários** — total de usuários (tabela `users`)
- **Consultas** — total de consultas (tabela `consultas`)
- **Taxa de cache** — `cache_hit / (cache_hit + cache_miss)` em %

### Seção 3 — Conversões

- **Cache hit rate** — percentual de consultas atendidas por cache.
- **Consultas / usuário** — média de consultas por usuário (quando há usuários).

---

## 3. API interna

- **GET /api/admin/metrics**
  - **Resposta:** `{ investigamais: { metrics: Record<string, number> }, ops: { users, queries, cacheHitRate } }`
  - **Proteção:** Em produção exige header `x-admin-metrics-secret` igual a `ADMIN_METRICS_SECRET`. Em desenvolvimento não exige. Retorna 403 se não autorizado.

---

## 4. Componentes

Reutilização dos componentes do `@devflow/ui`:

- **MetricsCard** — card com label e valor (número ou string).
- **MetricsSection** — seção com título e grid de cards.
- **FunnelVisualization** — (opcional) funil de etapas quando aplicável.

A página `/admin/metrics` usa esses componentes e atualização a cada 15 segundos (e botão "Atualizar").

---

## 5. Variáveis de ambiente

| Variável | Obrigatória (produção) | Descrição |
|----------|------------------------|-----------|
| `ADMIN_METRICS_SECRET` | Sim (para proteger /admin) | Segredo para header `x-admin-metrics-secret` e proteção da página em produção. |
