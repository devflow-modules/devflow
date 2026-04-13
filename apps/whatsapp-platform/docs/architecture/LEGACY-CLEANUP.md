# Legacy audit e cleanup — WhatsApp Platform

Documento vivo: consolida duplicidades, caminhos legados e decisões de consolidação.  
Última revisão: sprint de hardening — métricas Prisma, API padronizada, billing, testes de idempotência.

---

## 1. Fonte de verdade — mensagens e conversas

| Área | Canónico | Legado / paralelo | Decisão |
|------|----------|-------------------|---------|
| Threads e mensagens operacionais | Prisma `wa_inbox_threads`, `wa_inbox_messages` | Tabela Supabase `conversations` + `modules/conversations` | **Legado** só para código que ainda importa o repositório Supabase (ex.: leituras pontuais); **não** usar para métricas admin/ops, export CSV nem inbox UX. |
| Métricas admin / ops / export | `waInboxOpsMetrics`, `waInboxMessageStats` (Prisma) | — | **Fonte única** para contagens e CSV de threads/mensagens. |
| Página `/conversations` | — | Lista simples via `listConversations` (Supabase) | **Redirect 308 para `/inbox`**; entrada duplicada na navegação removida. |
| Inbox operacional | `/inbox` + APIs `/api/inbox/conversations/*` | — | **Único fluxo de atendimento.** |

**Risco mitigado:** utilizadores deixam de ver duas entradas “Conversas” vs “Inbox” com semânticas diferentes; números operacionais alinham com a inbox real.

---

## 2. Métricas e contagens (admin / ops)

- **Estado actual:** `countInboxThreadsTotal`, `countTenantsTotal`, `countMessagesLast24h` via Prisma em `api/admin/metrics`, `api/ops/metrics`, `lib/ops-metrics`, `admin/metrics/actions`, export admin.
- **Contrato Ops:** `GET /api/ops/metrics` mantém o shape planeado em `docs/shared/OPS_METRICS_CONTRACT.md` (product, users, mrr, tenants, conversations, messagesLast24h, …) e inclui **`trace_id`** + cabeçalho **`X-Trace-Id`** para correlação.

---

## 3. Respostas HTTP internas (`jsonSuccess` / `jsonError`)

- Helpers: `src/lib/api-response.ts` — `{ success, data, error, trace_id }` e **`X-Trace-Id`**.
- Rotas críticas alinhadas (entre outras): inbox listagem, auth (login, verify, logout), billing (subscription, checkout, portal), admin metrics (403 com `jsonError`), webhook POST JSON inválido.
- **Webhook Meta (200):** sucesso continua com `{ ok: true, trace_id }` + `X-Trace-Id` (compatível com reenvios da Meta); erros de parse usam `jsonError`.
- **Stripe webhook:** corpo em texto simples (`OK`) — inalterado; idempotência por `ensureWebhookIdempotency(event.id)` em `billingRepository`.
- Cliente: `src/lib/api-json-client.ts` — `unwrapApiData`, `readVerifyPayload`, `readSubscriptionFromApiJson`, `readBillingPostUrl` para suportar o novo contrato e payloads antigos durante a transição.

---

## 4. Automação inbound — IA vs “legacy” reply

- Caminho principal: `checkTenantAiAutomationReady` → `runTenantAiAutoReply`.
- Se IA não está pronta ou falha: `processLegacyInboundAutoReply` / regras antigas (logs: `using legacy path`, `fallback legacy`).
- **Reenvios duplicados (mesmo `wa_message_id`):** `hasInboundPipelineAudit` (tabela `AiMessageLog`) evita repetir pipeline IA/legado; persistência inbox usa `tenantId`+`waMessageId` único em `waInboxMessage` (segunda entrega não cria linha duplicada).

---

## 5. Billing — enforcement e fonte de plano

- **Limites e capabilities:** `plans.ts` → `planCapabilities.getTenantPlanCapabilities` e `planConfig.getPlanLimits` (este delega em `plans.ts`).
- **Plano efectivo do tenant:** `getTenantPlan` em `subscriptionService` (prioridade: `TenantSubscription` → `BillingSubscription` → `Tenant.plan`).
- **Enforcement:** `enforceUsageOrThrow` usa **`getTenantBillingContext`** (`getTenantPlan` + capabilities numa única leitura coerente).
- **Stripe:** `ensureWebhookIdempotency` grava `stripe_webhook_events`; segundo evento com o mesmo `event.id` não reprocessa efeitos.

---

## 6. Auth / roles

- `verifyToken.ts`: comentários legacy — preferir `ROLES_OPERATIONAL` onde aplicável.
- **Pendência baixa:** remover alias deprecated quando não houver imports.

---

## 7. URLs e hospedagem

- Webhook canónico: host do deploy `whatsapp-platform` (`/api/webhook/whatsapp`).
- Portal `devflowlabs.com.br`: redirect 308 para `NEXT_PUBLIC_WHATSAPP_APP_URL` (documentado em `DEPLOY_APP_SUBDOMAIN.md`).

---

## 8. Removido nesta sprint (consolidação UX)

- Item de navegação **duplicado** “Conversas” (`/conversations`) na barra principal — consolidado na **Inbox**.
- Rota `/conversations`: **redirect permanente** para `/inbox` (bookmarks e links antigos).

---

## 9. Mantido temporariamente (justificado)

| Item | Motivo |
|------|--------|
| `modules/conversations` + Supabase `conversations` | Chamadas remanescentes até remoção total do repositório legado; **não** é fonte de métricas/export actuais. |
| Filtros URL legacy na Inbox (`filter=high_no_response`, etc.) | Compatibilidade com links antigos; mapeamento explícito em `InboxShell`. |
| `legacyEvaluate` em regras de automação | Motor v1; substituição planejada com versão de motor, não nesta sprint. |
| Campos “legacy” no prompt IA (`legacySystemPrompt`) | Compatibilidade de dados até migração total para formulário comportamental. |

---

## 10. Checklist de aceite (hardening)

- [x] Fluxo principal de atendimento não depende da página `/conversations` nem da tabela Supabase para UX.
- [x] Métricas admin/ops/export usam Prisma (`wa_inbox_*`, tenants).
- [x] Testes cobrem idempotência webhook (pipeline) e persistência inbox (`waMessageId` único).
- [x] Teste de idempotência Stripe webhook (`ensureWebhookIdempotency`).
- [x] Documentação alinhada com o código (este ficheiro).

---

## Referências

- `docs/shared/OPS_METRICS_CONTRACT.md`
- `docs/whatsapp-platform/CANONICAL_MESSAGING.md`
- `DEPLOY_APP_SUBDOMAIN.md`, `PLANO_TRANSICAO_APP_SUBDOMINIO.md`
