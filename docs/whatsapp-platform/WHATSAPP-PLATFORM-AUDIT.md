# WhatsApp Platform Audit

**Data:** 2026-06-09  
**Escopo:** `apps/whatsapp-platform`, `packages/whatsapp-core`, `packages/whatsapp-routes`, portal (`src/`), docs WhatsApp.  
**Método:** leitura de código, docs e testes — **sem alterações de produção**. Itens não confirmados pelo código estão marcados explicitamente.

---

## 1. Resumo executivo

### Estado atual do produto

A WhatsApp Platform existe em **dois planos distintos** no monorepo:

1. **Runtime operacional (real)** — `apps/whatsapp-platform`: app Next.js com ~131 route handlers, Prisma/PostgreSQL, webhook Meta, inbox multiatendente, IA (LLM + fallback rule-based), motor de automação, billing Stripe, admin de plataforma e onboarding de canal via Meta Embedded Signup.
2. **Funil comercial e vitrine (majoritariamente mock)** — portal na raiz (`src/`): home, `/produtos/whatsapp-platform`, `/demo` e secções de métricas usam **dados estáticos/simulados**; `/contato` persiste lead no CRM via `POST /api/contato/diagnostico` **e** abre WhatsApp/e-mail; CRM outbound em `/admin/leads` é **real** mas **não cria tenant** automaticamente.

O runtime canónico **não vive mais no portal** — cutover via `packages/whatsapp-routes` + `src/proxy.ts` (308 para `NEXT_PUBLIC_WHATSAPP_APP_URL`).

### Nível de maturidade

| Camada | Maturidade |
|--------|------------|
| Webhook + persistência + envio Cloud API | **Alta** — implementado e testado em código |
| Inbox operacional (lista, mensagens, assign, tags, notas, fecho) | **Alta** |
| SLA visual e ordenação | **Média** — tiers fixos (5/15/30 min); SLA por fila no schema, uso runtime **não confirmado** |
| Handoff bot → humano | **Média** — P0-04: `needs_human` LLM + `handoffTriggers` + keywords sensíveis aplicam handoff persistido (`PENDING` + `HIGH`); assign default opcional |
| IA / FAQ / intent | **Média-alta** — safe mode piloto (P0-07); FAQ ainda não ligado à IA |
| Dashboard operacional (app) | **Média-alta** — manager dashboard com Prisma real; overview com `avgResponseTimeMs` hardcoded **0** |
| Funil comercial portal → piloto | **Média** — lead CRM + conversão com `convertedToRef`; tenant/Meta ainda assistidos |
| Documentação operacional | **Alta** — runbooks, checklists, playbooks (com drift em referências ao `whatsapp-webhook-api` legado) |

**Classificação global:** produto **operacionalmente implementado**, comercialmente **posicionado acima do que está plugado end-to-end** no funil portal → cliente real.

### Pronto para piloto real?

**Não automaticamente.** Com configuração manual (DB, env, tenant, número Meta, webhook em produção), o código suporta piloto de **1 cliente**. Pré-requisitos:

- Deploy do app canónico com variáveis documentadas em `apps/whatsapp-platform/.env.example`
- Migration Prisma aplicada
- Tenant + utilizadores criados (signup ou admin)
- Número WhatsApp conectado (Embedded Signup ou provisionamento admin)
- Webhook Meta apontando para `/api/webhook/whatsapp` do app canónico
- Chaves LLM se IA automática for requisito do piloto

### Maior risco atual

1. **Segurança do webhook Meta** — validação de assinatura `X-Hub-Signature-256` **não encontrada** no código (`grep` monorepo sem matches). Webhook aceita POST após verify token GET apenas.
2. **Expectativa comercial vs realidade técnica** — site e demo prometem handoff, SLA e dashboard com números que na vitrine são **mock**; handoff automático por IA é **parcial**.
3. **Desconexão funil comercial → produto (parcial)** — conversão CRM associa `convertedToRef` ao tenant; criação de tenant e onboarding Meta continuam **assistidos/manual** (ver [LEAD-TO-TENANT-PILOT.md](./LEAD-TO-TENANT-PILOT.md)).

### Próximo passo recomendado

**Fase 1 (1–2 semanas):** estabilizar piloto com 1 cliente — configurar ambiente real, validar webhook → inbox → resposta humana → fecho, implementar validação de assinatura Meta, documentar runbook único de onboarding (eliminando referências conflitantes ao `whatsapp-webhook-api` legado).

---

## 2. Inventário técnico

| Área | Caminho | O que contém | Status | Observações |
|------|---------|--------------|--------|-------------|
| App operacional | `apps/whatsapp-platform/` | Runtime canónico: inbox, webhook, IA, billing, admin, auth JWT | **real** | ~131 `route.ts`; Prisma dedicado; middleware JWT + demo mode |
| Core package | `packages/whatsapp-core/` | Normalização webhook, `WhatsAppCloudAdapter`, retry, status | **real** | README do pacote **desatualizado** (“a ser preenchido”) |
| Routes package | `packages/whatsapp-routes/` | Cutover 308, prefixos JWT/API, landing paths | **real** | Consumido por `src/proxy.ts`; sem testes no pacote |
| Webhook API legado | `apps/whatsapp-webhook-api/` | Express + pipeline inbound legado | **parcial** | README marca como **legado/experimental**; docs antigas ainda referenciam |
| Landing pública | `src/app/produtos/whatsapp-platform/` | Página SEO + secções marketing | **mock** | Dados hardcoded (filas ACME, SLA fictício) |
| Home / vitrine | `src/components/sections/` | HeroV2, Metrics, WhatsAppProduct, etc. | **mock** | `OperationalDashboardMock`, métricas estáticas (“70%”, “24/7”) |
| Demo | `src/app/demo/` | Fluxo guiado + dashboard operacional | **mock** | `DemoOperationalDashboard`: 847 msg, 612 bot — **sem API** |
| Contato / diagnóstico | `src/app/contato/` + `diagnostico-form.tsx` | Formulário briefing WhatsApp | **parcial** | Submit persiste lead (`POST /api/contato/diagnostico`, `origin: inbound_site`) e abre `wa.me`/mailto; analytics; deduplicação telefone **não** implementada (P1) |
| Admin leads | `src/app/admin/leads/` | CRM outbound DevFlow | **real** | Prisma root `Lead`; APIs `/api/admin/leads/*` |
| Lead finder | `src/app/admin/lead-finder/` | Busca Maps + cadastro lead | **parcial** | POST real a leads; sem scraping; workflow manual |
| APIs WhatsApp (portal) | `src/app/api/whatsapp/` | — | **pendente** | **Removido** do portal; canónico no app |
| APIs admin WhatsApp (portal) | `src/app/api/admin/whatsapp/`, `conversations/` | — | **pendente** | **Removido**; canónico no app |
| APIs admin (portal) | `src/app/api/admin/leads/`, `metrics/` | CRM leads + métricas portal | **real** | Métricas portal ≠ métricas WhatsApp ops |
| Docs WhatsApp | `docs/whatsapp/` (~38 ficheiros) | Setup, webhooks, runbooks, playbooks comerciais | **documentação** | Algumas refs ao webhook-api legado |
| Docs WhatsApp Platform | `docs/whatsapp-platform/` (17 ficheiros) | Inbox, IA, billing, automação | **documentação** | Índice em `README.md` (6 entradas principais) |
| Ops runbooks (app) | `apps/whatsapp-platform/docs/ops/` | GO_LIVE, INCIDENT_RESPONSE, ENVIRONMENT | **documentação** | Complementa docs raiz |
| Governança produtos | `docs/products/` | PRODUCT-GOVERNANCE, PRODUCT-INVENTORY | **documentação** | WhatsApp = P0; próxima decisão: auditar MVP piloto |
| Proxy / cutover | `src/proxy.ts` | 308 UI operacional → app canónico | **real** | Substitui `middleware.ts` no portal |
| E2E | `apps/whatsapp-platform/tests/e2e/` | inbox, onboarding, mobile-revenue | **real** | Playwright; helpers com mock de API |

---

## 3. Rotas e fluxos existentes

### 3.1 Rotas públicas (portal)

| Rota | Conteúdo | Classificação |
|------|----------|---------------|
| `/` | Home reposicionada WhatsApp Platform | **pronto** (marketing); métricas **mock** |
| `/produtos/whatsapp-platform` | Landing produto | **pronto** (mock visual) |
| `/demo` | Demo guiada | **mock** |
| `/contato` | Diagnóstico comercial | **parcial** — lead CRM automático; CTA WhatsApp preservado |
| `/automacao-whatsapp/*`, `/software-atendimento-whatsapp/*`, `/chatbot-whatsapp/*` | SEO clusters | **pronto** (conteúdo estático) — permanecem no portal (`whatsapp-routes/landing.ts`) |

### 3.2 Rotas internas (portal)

| Rota | Conteúdo | Classificação |
|------|----------|---------------|
| `/admin/leads` | CRM outbound | **pronto** |
| `/admin/lead-finder` | Prospecção Maps | **parcial** |
| `/admin/metrics` | Métricas portal (finance/growth) | **pronto** — não é dashboard WhatsApp |

### 3.3 Rotas do app operacional (`apps/whatsapp-platform`)

**Auth:** `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/admin/login`

**Operação tenant:** `/inbox`, `/conversations`, `/automation`, `/distribuir`, `/agents`, `/queues`, `/dashboard`, `/dashboard/whatsapp`, `/dashboard/billing`, `/dashboard/ai`, `/settings/*`, `/onboarding`

**Admin plataforma:** `/admin/metrics`, `/admin/billing`, `/admin/affiliates`, `/admin/tenants`, `/admin/whatsapp`, `/admin/agents`, `/admin/chat`, `/admin/conversations`

| Fluxo | Classificação |
|-------|---------------|
| Login JWT → inbox | **pronto** |
| Onboarding pós-Stripe | **pronto** — **precisa configuração** Stripe |
| Embedded Signup Meta | **pronto** — **precisa configuração** Meta app |
| Showcase demo (`NEXT_PUBLIC_DEMO_MODE`) | **mock** — fixtures locais (`DEMO-WALKTHROUGH.md`) |
| Demo comercial app real (tenant demo staging) | **documentado** | [REAL-APP-DEMO.md](./REAL-APP-DEMO.md) — dados fictícios; seed automatizado = P1 |

### 3.4 Rotas de API (app canónico)

| Grupo | Prefixo | Classificação |
|-------|---------|---------------|
| Webhook Meta | `/api/webhook/whatsapp`, `/api/webhooks/whatsapp` | **pronto** — **precisa configuração** + risco assinatura |
| Inbox | `/api/inbox/*` | **pronto** |
| Auth | `/api/auth/*` | **pronto** |
| WhatsApp onboard | `/api/whatsapp/onboard/*` | **pronto** — **precisa configuração** Meta |
| Admin ops | `/api/admin/whatsapp/*`, `/api/admin/conversations/*` | **pronto** |
| IA / automação | `/api/ai/*`, `/api/automation/*` | **parcial** (FAQ/intent gaps) |
| Billing | `/api/billing/*`, `/api/stripe/*` | **pronto** — **precisa configuração** Stripe |
| Métricas | `/api/metrics/*`, `/api/inbox/metrics` | **parcial** (stubs) |
| Cron | `/api/cron/*` | **pronto** — **precisa configuração** scheduler Vercel/cron |
| Realtime | `/api/realtime/stream` | **pronto** |

**Portal:** APIs operacionais WhatsApp **ausentes** (cutover documentado em `packages/whatsapp-routes`).

### 3.5 Fluxos de conversão (portal)

```
Home → /demo (mock) → /contato (CRM + wa.me) → [manual] /admin/leads → [manual] tenant no app
```

| Etapa | Classificação |
|-------|---------------|
| CTA home → demo | **pronto** |
| Demo → contato | **pronto** |
| Contato → lead CRM | **pronto** (`POST /api/contato/diagnostico`, `origin: inbound_site`) |
| Lead → tenant piloto | **pronto** (assistido) — `POST …/convert` + `convertedToRef`; ver LEAD-TO-TENANT-PILOT.md |
| Stripe self-serve → onboarding | **pronto** no app — **não ligado** ao funil portal |

### 3.6 Fluxos de webhook

```
Meta POST → normalizeWebhookPayload (whatsapp-core)
         → resolveTenantByPhoneNumberId
         → persistWaInboxFromWebhook
         → [se canal ACTIVE + IA ready] runTenantAiAutoReply
         → [senão] processLegacyInboundAutoReply (rule-based)
         → recordWebhookProcessingSuccess (WebhookHealth)
```

| Etapa | Classificação |
|-------|---------------|
| GET verify (`WHATSAPP_VERIFY_TOKEN`) | **pronto** |
| POST persistência + idempotência | **pronto** |
| POST validação assinatura Meta | **ausente** |
| Auto-reply LLM | **pronto** — **precisa configuração** API keys |
| Rate limit POST | **pronto** |

### 3.7 Fluxos de inbox

| Fluxo | Classificação |
|-------|---------------|
| Listar conversas + filtros/fases | **pronto** |
| Ver/enviar mensagens | **pronto** |
| Assign / unassign | **pronto** |
| Fila `queue/next` + auto-assign | **pronto** |
| Tags, notas, audit | **pronto** |
| Fechar conversa | **pronto** |
| SSE realtime | **pronto** |
| Handoff automático por IA | **pronto (piloto)** | P0-04 + P0-07 — needs_human, triggers, guard, safe mode, confiança |
| SLA badge + ordenação crítica | **pronto** (MVP tiers fixos) |

### 3.8 Fluxos admin/comercial

| Fluxo | Classificação |
|-------|---------------|
| Prospecção manual (leads) | **pronto** |
| Templates WhatsApp outbound | **documentação** (`docs/crm/MESSAGE-TEMPLATES.md`) |
| Provisionamento canal (`/admin/whatsapp`) | **pronto** no app |
| Ativação número (runbook) | **documentação** + APIs admin — **precisa configuração** |
| Métricas plataforma (`/admin/metrics`) | **parcial** — mix DB + counters in-memory (**não confirmado** detalhe de counters) |

---

## 4. Integração Meta WhatsApp Cloud API

### Variáveis de ambiente necessárias

Fonte: `apps/whatsapp-platform/.env.example`, `docs/whatsapp/PRODUCTION_CHECKLIST.md`

| Variável | Obrigatória piloto | Uso |
|----------|-------------------|-----|
| `WHATSAPP_DATABASE_URL` | Sim | Prisma PostgreSQL |
| `WHATSAPP_DIRECT_URL` | Sim | Migrations |
| `JWT_SECRET` | Sim | Auth utilizadores |
| `NEXT_PUBLIC_WHATSAPP_APP_URL` | Sim | URLs públicas / cutover |
| `WHATSAPP_VERIFY_TOKEN` | Sim | GET webhook verify |
| `WHATSAPP_PHONE_NUMBER_ID` | Sim* | Fallback single-tenant / dev |
| `WHATSAPP_ACCESS_TOKEN` | Sim* | Fallback / dev |
| `META_APP_ID`, `META_APP_SECRET` | Sim (multi-tenant) | Embedded Signup |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | Sim (multi-tenant) | OAuth |
| `WHATSAPP_OAUTH_REDIRECT_URI` | Sim (multi-tenant) | Callback |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Opcional | IA automática |
| `WHATSAPP_ENABLE_LLM` | Opcional | Gate LLM |
| `WHATSAPP_ADMIN_METRICS_SECRET` | Sim (prod admin) | Bypass admin ops |
| `WHATSAPP_SUPABASE_*` | Parcial | Service role; legado messages repo **deprecated** |

\*Por tenant: credenciais em `WhatsappPhoneNumber` após onboarding.

### Checklist Meta

| Item | Implementado | Documentado | Pendente | Risco |
|------|-------------|-------------|----------|-------|
| Webhook verify token (GET) | ✅ | ✅ | — | Baixo |
| Receber mensagens (POST) | ✅ | ✅ | — | Médio (sem assinatura) |
| Normalização payload | ✅ (`whatsapp-core`) | ✅ | — | Baixo |
| Resolver tenant por `phone_number_id` | ✅ | ✅ | — | Baixo |
| Envio texto Cloud API | ✅ | ✅ | — | Baixo |
| Status de entrega (webhook status) | ✅ | ✅ | — | Baixo |
| Embedded Signup / OAuth | ✅ | ✅ | — | Médio (config Meta) |
| Ativação manual admin | ✅ | ✅ (`WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md`) | — | Operacional |
| Validação `X-Hub-Signature-256` | ❌ | Parcial (Meta exige) | ✅ | **Alto** |
| Retry outbound (`whatsapp-core/retry.ts`) | ✅ | Parcial | — | Baixo |
| Rate limit webhook | ✅ | ✅ | — | Baixo |
| Logs piloto (`OBSERVABILITY-PILOT.md`, `whatsappLogger.ts`) | ✅ | ✅ | — | Baixo |
| Idempotência inbound | ✅ (`aiMessageLog`) | Parcial | — | Baixo |
| `WebhookHealth` telemetria | ✅ | Parcial | — | Baixo |
| Auto-heal canal | ✅ (flag) | Parcial | — | **Não confirmado** em produção |

---

## 5. Inbox e operação humana

| Item | Classificação | Evidência |
|------|---------------|-----------|
| Lista de conversas | **existe** | `InboxShell`, `/api/inbox/conversations`, `waInboxQueries.ts` |
| Histórico de mensagens | **existe** | `WaInboxMessage`, API messages |
| Status da conversa (OPEN/PENDING/CLOSED) | **existe** | `threadStatusService`, UI + API status |
| Atribuição para atendente | **existe** | `assignThread`, API assign, UI |
| Handoff bot → humano | **parcial** | IA para quando `assignedToUserId` ou status `PENDING`; auto-handoff via `applyNeedsHumanHandoff` (P0-04) |
| Prioridade | **existe** | `WaInboxThreadPriority`, filtros |
| SLA | **parcial** | Tiers 5/15/30 min UI; `slaTargetMinutes` por fila no schema — uso runtime **não confirmado** |
| Filtros (fase, mine, unassigned, etc.) | **existe** | `waInboxQueries.ts` |
| Busca (`q`) | **existe** | ILIKE nome/telefone/conteúdo |
| Tags | **existe** | CRUD + thread tags; gated por plano `QUEUES_TAGS` |
| Notas internas | **existe** | `WaInboxInternalNote`, API |
| Encerramento/resolução | **existe** | Tenant: status CLOSED; Admin: resolve |
| Filas + `queue/next` | **existe** | `WaInboxQueue`, auto-assign |
| Presença agentes | **existe** | `/api/inbox/presence`, `AgentStatus` |
| Typing indicators | **existe** | API typing |
| Audit trail | **existe** | `WaInboxAuditLog`, tab audit |
| Sugestão resposta IA (operador) | **existe** | `/api/inbox/conversations/[id]/suggest-reply` |
| CRM prospect panel | **existe** | `DevFlowProspectPanel`, feature flag prospecting |
| Realtime SSE | **existe** | `/api/realtime/stream` |

---

## 6. Multi-tenancy e dados

### Modelo

| Entidade | Modelo Prisma | Isolamento |
|----------|---------------|------------|
| Tenant | `Tenant` (`whatsapp_tenants`) | Root de isolamento |
| Utilizadores | `User` + `UserSession` | `tenantId` + role (`operator`, `manager`, `platform_admin`) |
| Canal WhatsApp | `WhatsappPhoneNumber` | Por tenant; token por linha |
| Conversas | `WaInboxThread` | `tenantId` obrigatório |
| Mensagens | `WaInboxMessage` | Via thread |
| Webhook health | `WebhookHealth` | Por tenant |
| Auditoria | `WaInboxAuditLog`, `AuditLog` | Por tenant / plataforma |
| Config operacional | `TenantOperationalConfig` | Pausa IA/automação |
| Billing | `BillingSubscription`, `UsageEvent` | Por tenant |

### Auth

- **JWT próprio** (`jose` + cookie) — **não** Supabase Auth para utilizadores do produto.
- Supabase: PostgreSQL + service role; repositório legado `messagesRepository.ts` **deprecated**.

### Riscos de segurança e isolamento

| Risco | Severidade | Detalhe |
|-------|------------|---------|
| Webhook sem assinatura Meta | **Mitigado (P0-01)** | HMAC SHA-256 em produção |
| Admin search scoped ao JWT tenant | **Média** | `platform_admin` cross-tenant — comportamento **não confirmado** em todos endpoints |
| Tokens Meta por linha em DB | **Média** | Exposição via logs/backup — política de rotação **não confirmada** no código |
| Legado Supabase messages | **Baixa** | Deprecated; risco de confusão operacional |
| CRM portal (Lead) vs Tenant (app) | **Média** | Bases/schemas distintos; sem sync automático |
| LGPD / retenção / consentimento | **Média (gap parcial)** | [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) (P0-08); DPA/retenção automática/export = P1 |
| PII em logs | **Média (mitigado parcial)** | [OBSERVABILITY-PILOT.md](./OBSERVABILITY-PILOT.md) + [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) §6; manter `WHATSAPP_WEBHOOK_VERBOSE` desligado em prod |

### Migrações

- Prisma migrations em `apps/whatsapp-platform/prisma/migrations/`
- SQL consolidado: `docs/whatsapp/MIGRATION_CONSOLIDATED.sql`
- Legado: migration Supabase conversations/messages — runtime canónico é `wa_inbox_*`

---

## 7. IA e automações

### Componentes

| Componente | Maturidade | Real vs mock |
|------------|------------|--------------|
| Pipeline LLM inbound | **Alta** | OpenAI/Anthropic via `aiProvider.ts`, `aiAutomationService.ts` |
| Fallback rule-based | **Média** | `ruleBasedReplies.ts`, menu numérico DevFlow |
| `WHATSAPP_DEMO_MODE` (palavra "demo") | **Baixa** | Heurístico servidor |
| Guards IA | **Alta (piloto)** | `aiGuard.ts` + safe mode P0-07: keywords sensíveis, thread `PENDING`, humano atribuído, quota billing |
| Structured output (intent, confidence, needs_human) | **Alta (piloto)** | `aiPilotDecision.ts` — confiança mínima, intent `suporte`, erro LLM → handoff |
| FAQ CRUD | **Baixa (operacional)** | API `/api/faq` — **sem** uso em módulos IA |
| Automação regras (`WaAutomationRule`) | **Alta** | Engine completa: triggers, actions (assign, tag, send, AI), playbooks, cron |
| `evaluateAutomationRules` | **Média** | `handoffTriggers`, saudação curta; preço em safe mode → handoff pré-LLM |
| Simulação IA (`/api/ai/test`) | **Real API** | Ambiente teste, não produção |
| Showcase `NEXT_PUBLIC_DEMO_MODE` | **Mock** | Fixtures `src/demo/fixtures.ts` — distinto de tenant demo real ([REAL-APP-DEMO.md](./REAL-APP-DEMO.md)) |

### Handoff por intenção / safe mode (P0-04 + P0-07)

- Config: `AiAgentConfig.handoffTriggers` → `evaluateAutomationRules` → handoff.
- LLM: `needs_human`, confiança &lt; `WHATSAPP_AI_MIN_CONFIDENCE` (default 0.65), intent `suporte`, parse incerto, erro → `applyNeedsHumanHandoff`.
- Safe mode (`WHATSAPP_AI_SAFE_MODE` default on): preço/orçamento/reembolso/jurídico → handoff **antes** do LLM.
- Guard keywords sensíveis (`procon`, `cancelar`, `humano`, `reembolso`, etc.) → handoff.
- Thread `PENDING` → **no auto-reply** (sem re-handoff redundante).
- Decisão auditável: `AiMessageLog.decisionReason` (motivo + intent/conf, sem corpo integral).
- Erro LLM **não lança** — handoff seguro; webhook mantém 200.

### Limites e logs

- Quota/billing: `checkTenantAiAutomationReady`
- Logs: `AiMessageLog`, `AiUsageLog`
- Idempotência: `WaAutoReplyClaim`

---

## 8. Dashboard e métricas

### Portal (público) — simulado

| Surface | Dados | Status |
|---------|-------|--------|
| Home `OperationalDashboardMock` | 1.247 msg, 74% bot, fila fictícia | **mock** |
| Secção `Metrics` | "70%", "24/7", "100%" | **mock** (copy aspiracional) |
| `/demo` dashboard | 847 msg, 612 bot, 23 humano | **mock** |
| Landing produto | Preview ACME, SLA 6m | **mock** |

### App operacional — real (com ressalvas)

| Métrica / API | Fonte | Status |
|---------------|-------|--------|
| Manager dashboard | `managerDashboardService.ts` — awaiting, unassigned, critical, avgFirstResponseMs, funnel | **real** |
| Inbox metrics | `inboxMetricsService.ts` | **real** |
| Overview `/api/metrics/overview` | Prisma messages count | **parcial** — `avgResponseTimeMs: 0` hardcoded |
| Intent distribution | `getIntentDistribution()` | **mock/stub** — retorna `[]` |
| AI metrics / funnel / opportunity | módulos `/api/ai/*` | **real** (com testes) |
| Revenue metrics | `/api/metrics/revenue` | **real** |
| Admin metrics plataforma | Prisma counts + counters | **parcial** |
| Demo mode app | `DEMO_METRICS_OVERVIEW` fixtures | **mock** quando `NEXT_PUBLIC_DEMO_MODE=true` |

### Admin portal

- `/api/admin/metrics` — finance + growth do **portal**, não inbox WhatsApp.

### Tracking funil

- Analytics client-side: `trackFunnelCtaClick`, `trackDiagnosticoFormSubmit`, `trackCtaWhatsAppClick` em `src/lib/analytics`
- Ligação analytics → CRM lead: persistência CRM no submit (`POST /api/contato/diagnostico`); evento analytics **não** correlaciona automaticamente com `lead.id` (sem UTM/session bridge)

---

## 9. Diagnóstico e funil comercial

### `/contato`

- Formulário: nome, WhatsApp, empresa, segmento, volume, problema, horário.
- Submit: `POST /api/contato/diagnostico` → cria `Lead` (`status: novo`, `origin: inbound_site`, interesse `whatsapp_platform` em `notes`) → monta mensagem → `getWhatsAppOrMailtoUrl()` → abre WhatsApp/e-mail.
- Analytics: `trackDiagnosticoFormSubmit`.
- Rate limit por IP (`contato-diagnostico`); falha de persistência mostra mensagem genérica mas **não bloqueia** o CTA WhatsApp.
- Deduplicação por telefone: **não implementada** (dívida P1).

### Admin leads

- CRUD real via `/api/admin/leads`.
- Status recomendados: `novo` → … → `ganho`/`fechado`/`perdido`.
- Origens: `outbound_whatsapp`, `lead_finder_google_maps`, `inbound_site`, `demo`.
- Convert POST: marca `convertedAt`, `convertedToType: "whatsapp_platform"`, **`convertedToRef: tenantId`** (P0-06); trilha em `notes`; **não** cria tenant automaticamente.

### Lead finder

- UI busca Google Maps (externo) + cadastro manual de telefone.
- POST lead com `origin: lead_finder_google_maps`.

### Templates e tracking

- Templates: `docs/crm/MESSAGE-TEMPLATES.md` (**documentação**).
- Playbook GTM: `docs/GO-TO-MARKET.md`, `docs/whatsapp/DEMO_AND_CLIENT_READINESS_PLAYBOOK.md`.

### Fluxo ideal vs atual

**Ideal (piloto):**
```
Site → Diagnóstico → Lead CRM → Qualificação → Contrato → Tenant + canal Meta → Go-live → Suporte
```

**Atual:**
```
Site → Demo (mock) → /contato (lead CRM + wa.me) → qualificação → convert CRM (tenantId) → [manual] signup/canal Meta → go-live
```

**Faltas:**

1. ~~POST diagnóstico → lead CRM (`origin: inbound_site`)~~ **feito (P0-05)**
2. ~~Convert lead → associar `convertedToRef` (tenantId)~~ **feito (P0-06)** — criação tenant/canal ainda manual
3. Tracking UTM → lead ( **não confirmado** )
4. Self-serve checkout portal → app onboarding (existe no app, **não exposto** no funil principal)
5. Runbook único lead → piloto (docs existem separados, **não integrados**)

---

## 10. Readiness para piloto real

| Item | Status | Notas |
|------|--------|-------|
| Cliente configurável (tenant) | **Parcial** | Signup/admin cria tenant; **sem** automação a partir do CRM |
| Número WhatsApp conectado | **Parcial** | Embedded Signup + admin provision; **precisa configuração** Meta |
| Webhook recebendo | **Parcial** | Código + assinatura P0-01; deploy + verify token |
| Mensagem enviada | **Parcial** | Cloud API implementada; depende canal ACTIVE + token |
| Conversa persistida | **OK** | `WaInboxThread` + `WaInboxMessage` |
| Inbox operacional | **OK** | UI + APIs completas |
| Handoff humano | **Parcial** | Manual assign OK; auto-handoff P0-04 (LLM/triggers/guard) |
| SLA mínimo | **Parcial** | Badges/ordenação OK; alertas proativos **não confirmados** |
| Logs/auditoria | **OK** | Audit log, AI logs, webhook health |
| Diagnóstico comercial | **Parcial** | Form + CRM + conversão piloto; onboarding Meta manual |
| Runbook de operação | **OK** | Vários runbooks; drift webhook-api |
| Plano de rollback | **Parcial** | Rollback em `WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md` §8 |
| Segurança básica | **Parcial** | JWT OK; webhook signature **OK (P0-01)**; LGPD checklist **OK (P0-08 doc)**; DPA formal P1 |

**Veredicto piloto:** viável com **onboarding assistido manual** e checklist técnico; **não** repetível sem fechar gaps do funil e segurança.

---

## 11. MVP recomendado

### P0 — obrigatório para piloto (1 cliente real)

1. Deploy app canónico com env completo (DB, JWT, Meta, LLM se necessário).
2. Migration Prisma + tenant + 2–3 utilizadores (gestor + operadores).
3. Conectar 1 número via Embedded Signup ou admin; validar webhook end-to-end.
4. ~~**Implementar validação `X-Hub-Signature-256`** no webhook.~~ **P0-01 concluído**
5. Smoke test documentado: inbound → inbox → resposta humana → fecho.
6. Runbook único de onboarding (consolidar docs existentes; marcar webhook-api como legado).
7. **Checklist LGPD piloto** assinado antes de tráfego real ([LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) §10).
8. Em demo comercial assistida: seguir [REAL-APP-DEMO.md](./REAL-APP-DEMO.md) (tenant demo staging); não usar `/demo` mock nem vitrine `NEXT_PUBLIC_DEMO_MODE` como substituto do app real.
9. Handoff mínimo operacional: regra de automação ou procedimento manual de assign quando IA escalona.

### P1 — necessário para venda repetível

1. ~~POST `/contato` → lead CRM automático.~~ **P0-05 concluído**
2. ~~Convert lead → associar tenant (`convertedToRef`)~~ **P0-06** — wizard auto-criação tenant = P1+
3. Self-serve ou semi-self-serve: Stripe checkout → onboarding (já existe no app; expor no funil).
4. FAQ ligado à IA ou playbooks pré-configurados por segmento.
5. `needs_human` → assign ou notificação automática.
6. Métricas overview reais (`avgResponseTimeMs`, intents).
7. ~~Política LGPD mínima (retenção, export, base legal) — doc operacional.~~ **Checklist P0-08**; export/retenção automática = P1
8. Observabilidade: alertas webhook down, canal inativo.
9. Billing gating testado em produção (planos, limites IA).

### P2 — escala e sofisticação

1. SLA por fila configurável + alertas.
2. Intent analytics reais.
3. Multi-canal por tenant maduro.
4. Integração CRM externo outbound (já existe payload em `whatsapp-core`).
5. White-label hostname (`NEXT_PUBLIC_PRODUCT_MODE=WHITE_LABEL`).
6. Metered billing estável + reconciliação cron.
7. E2E contínuo contra staging Meta sandbox.
8. Remover/arquivar `whatsapp-webhook-api` e limpar docs.

---

## 12. Riscos e dívidas técnicas

| Risco | Impacto | Mitigação sugerida |
|-------|---------|-------------------|
| Meta Cloud API — verificação business | Bloqueio go-live | Runbook existente; expectativa comercial alinhada |
| Webhook público sem assinatura | Spoofing / abuse | **Mitigado:** P0-01 HMAC SHA-256 |
| Token/secrets em DB | Vazamento | Rotação, encryption at rest — **não confirmado** |
| Supabase/Auth confusão | Ops erradas | Documentar: JWT próprio, não Supabase Auth |
| Multi-tenant leak | Dados cruzados | Audit endpoints admin cross-tenant |
| Dados sensíveis conversa | LGPD | Checklist piloto P0-08; DPA + retenção P1 |
| LGPD gap | Legal/comercial | Mitigado parcialmente (checklist); revisão jurídica P1 |
| Billing Stripe complexity | Churn técnico | Piloto pode ignorar billing; P1 antes de self-serve |
| Observabilidade | Incidentes silenciosos | WebhookHealth + alertas |
| Dependência mocks no site | Expectativa falsa | [REAL-APP-DEMO.md](./REAL-APP-DEMO.md) — três modos (portal mock, vitrine, tenant demo real) |
| Expectativa comercial vs técnica | Churn pós-venda | Demo no app real documentada; piloto separado do tenant demo |
| Docs drift (webhook-api) | Deploy errado | Consolidar runbook canónico |
| `avgResponseTimeMs` / intents stub | Dashboard enganoso | Corrigir antes de vender métricas |
| FAQ desligado da IA | Valor IA menor | P1 integração |
| Lead → tenant manual | Escala comercial | P1 automação |
| Legado Supabase messages repo | Confusão dev | Remover quando seguro |
| `platform_admin` scope | Segurança admin | Revisar guards |

---

## 13. Próximo plano de ação

### Fase 1: Estabilizar piloto real (1–2 semanas)

**Entregáveis:**

- [ ] Ambiente staging/prod app canónico com env validado (`docs/ops/ENVIRONMENT.md`)
- [ ] Migration aplicada; smoke inbound/outbound
- [ ] Validação assinatura webhook Meta
- [ ] Runbook consolidado "Lead → Piloto → Go-live" (1 doc)
- [ ] Checklist PRODUCTION_CHECKLIST executado e assinado
- [x] Demo comercial usando **app real** documentada ([REAL-APP-DEMO.md](./REAL-APP-DEMO.md); execução em staging por equipa comercial)

### Fase 2: Operar primeiro cliente (2–4 semanas)

**Entregáveis:**

- [ ] Tenant cliente live com 1 número ACTIVE
- [ ] Equipa cliente treinada (inbox, assign, fecho)
- [ ] Regras IA/automação acordadas configuradas
- [ ] Handoff manual documentado e testado
- [ ] Incident response testado (`INCIDENT_RESPONSE.md`)
- [ ] Métricas manager dashboard revistas com cliente (dados reais)

### Fase 3: Tornar repetível (4–8 semanas)

**Entregáveis:**

- [x] Diagnóstico → lead CRM automático (P0-05)
- [x] Lead convert → tenant associado (`convertedToRef`, P0-06) — runbook [LEAD-TO-TENANT-PILOT.md](./LEAD-TO-TENANT-PILOT.md)
- [ ] Wizard admin: auto-criar tenant + convite a partir do convert (P1+)
- [ ] Stripe self-serve ou semi-assistido no funil
- [ ] FAQ/playbooks por vertical
- [ ] `needs_human` → assign automático
- [ ] Métricas overview corrigidas
- [x] Política LGPD mínima documentada ([LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) — assinatura por piloto pendente)
- [ ] Atualizar `PRODUCT-INVENTORY.md` com status pós-piloto

### Fase 4: Escalar produto (8+ semanas)

**Entregáveis:**

- [ ] SLA configurável por fila + alertas
- [ ] Intent analytics
- [ ] Metered billing produção
- [ ] White-label se contratado
- [ ] Arquivar webhook-api legado
- [ ] Suite E2E staging contínua
- [ ] P2 backlog priorizado com governança (`PRODUCT-GOVERNANCE.md`)

---

## Referências auditadas

- Código: `apps/whatsapp-platform/`, `packages/whatsapp-core/`, `packages/whatsapp-routes/`, `src/app/`, `src/proxy.ts`
- Docs: `docs/whatsapp/`, `docs/whatsapp-platform/`, `docs/crm/`, `docs/products/`
- Runbooks: `docs/whatsapp/WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md`, `docs/whatsapp/DEMO_AND_CLIENT_READINESS_PLAYBOOK.md`, `apps/whatsapp-platform/docs/ops/`
- Governança: `docs/products/PRODUCT-GOVERNANCE.md`, `docs/products/PRODUCT-INVENTORY.md`

---

*Auditoria gerada por inspeção de código — não substitui teste em ambiente com credenciais Meta reais.*
