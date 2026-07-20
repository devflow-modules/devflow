# WhatsApp Platform — Architecture (cross-cutting)

**Status:** current  
**Last updated:** 2026-07-20  
**Complements:** `apps/whatsapp-platform/docs/ARCHITECTURE.md` (app layers), root `ARCHITECTURE.md` (monorepo), [CURRENT-SCOPE.md](./CURRENT-SCOPE.md), [DOCUMENTATION-MAP.md](./DOCUMENTATION-MAP.md).

This document is the **ownership and boundary** map for agents and humans. Prefer extending existing modules over inventing parallel paths.

---

## 1. Runtime diagram

```text
                    ┌─────────────────────────────┐
                    │  Meta WhatsApp Cloud API    │
                    └──────────────┬──────────────┘
                                   │ webhook / Graph send
                                   ▼
┌──────────────┐   308 cutover    ┌──────────────────────────────────┐
│ Portal src/  │ ───────────────► │ apps/whatsapp-platform (active)  │
│ marketing    │  whatsapp-routes │  UI · API · webhook · Prisma     │
│ CRM leads    │                  │  JWT auth · Stripe handlers      │
└──────┬───────┘                  └───────────┬──────────────────────┘
       │                                      │
       │ portal Prisma (Lead)                 │ WhatsApp Prisma (Tenant…)
       ▼                                      ▼
┌──────────────┐                  ┌──────────────────────────────────┐
│ Portal DB    │                  │ WhatsApp dedicated PostgreSQL    │
└──────────────┘                  └──────────────────────────────────┘

Shared packages (no Next pages, no WhatsApp Prisma ownership):
  whatsapp-core · whatsapp-routes · billing-core · ai-core · analytics-core

Legacy (do not grow):
  apps/whatsapp-webhook-api  →  legacy-compatible
```

---

## 2. Ownership matrix

| Surface | Responsibility | Status |
|---------|----------------|--------|
| `apps/whatsapp-platform` | Canonical runtime: UI, route handlers, Prisma schema/migrations, auth composition, webhook Meta, Stripe webhooks, inbox, AI orchestration, admin | **active** |
| `packages/whatsapp-core` | Pure WhatsApp domain: normalize webhook payloads, Cloud API adapter helpers, retry/status types, reusable contracts | **shared** |
| `packages/whatsapp-routes` | Route/cutover/landing constants reused by portal (and shared surfaces); JWT/API path prefixes for cutover | **shared** |
| `packages/billing-core` | Shared plan/quota/entitlement/billing rules and Stripe-oriented helpers consumed by the app | **shared** |
| `packages/ai-core` | Shared AI contracts: intent helpers, LLM provider abstractions, fallback/format utilities | **shared** |
| `packages/analytics-core` | Shared metrics/event helpers | **shared** |
| `src/` (portal) | Public site, acquisition, commercial pages, demo mock, internal CRM leads | **active** (non-ops) |
| `apps/whatsapp-webhook-api` | Legacy Express inbound pipeline; reference / isolated scenarios only | **legacy-compatible** |

### App module map (canonical)

Under `apps/whatsapp-platform/src/modules/` (indicative owners):

| Module area | Owns |
|-------------|------|
| `whatsapp`, webhook handlers | Meta verify/POST, signature, health |
| `inbox`, `conversations`, `presence`, `realtime` | Threads, messages, assign, SSE |
| `messaging` | Outbound Cloud API composition |
| `ai`, `automation` | Auto-reply, safe mode, rules engine |
| `billing`, `stripe` | Subscriptions, usage, Stripe webhooks |
| `tenants`, `auth`, `onboarding` | Tenant lifecycle, JWT session, onboarding |
| `metrics`, `analytics`, `dashboard` | Operational metrics surfaces |
| `operations`, `support`, `affiliates`, `commercial` | Platform ops / GTM adjuncts |

UI: `src/components/**`, `src/app/**`. Infra: `src/lib/**`, `prisma/`.

---

## 3. Allowed dependencies

```text
apps/whatsapp-platform
  → packages/whatsapp-core
  → packages/billing-core
  → packages/ai-core
  → packages/analytics-core
  → packages/ui (and other shared non-app packages as already used)
  → Prisma Client (app-owned schema)
  → Next.js, Stripe SDK, Meta/Graph HTTP, Supabase client (as configured)

packages/whatsapp-core
  → pure TS / shared types only
  ✗ Next.js, Prisma Client, Stripe SDK, Meta official SDK (keep HTTP-agnostic helpers)

packages/whatsapp-routes
  → constants / path helpers only
  ✗ reimplement domain rules that belong in whatsapp-core or the app

packages/billing-core
  → billing rules (+ Stripe helpers as already structured)
  ✗ WhatsApp inbox/Prisma models

packages/ai-core / analytics-core
  → pure/shared mechanisms
  ✗ app route handlers, tenant auth, Prisma

src/ (portal)
  → packages/whatsapp-routes (cutover)
  → portal Prisma / CRM
  ✗ apps/whatsapp-platform imports
  ✗ WhatsApp app Prisma / @wa aliases (CI guard)

apps/whatsapp-webhook-api
  → may use whatsapp-core / ai-core for legacy compatibility
  ✗ new product features (implement in whatsapp-platform instead)
```

Apps **must not** import other apps. Share only via `packages/*`.

---

## 4. Trust boundaries

| Boundary | Rule |
|----------|------|
| **Tenant** | Every read/write of customer ops data filtered by `tenantId` resolved server-side — never trust client-supplied tenant as authority alone |
| **Webhook Meta** | GET verify token; POST signature (`X-Hub-Signature-256`); resolve tenant from `phone_number_id`; idempotent processing; fast 200 after accept |
| **Auth** | JWT/session of the WhatsApp app; role checks on protected routes; platform_admin is explicit elevation |
| **Billing** | Entitlements and quotas enforced server-side; Stripe webhook idempotency; white-label must not leak internal pricing/margins |
| **UI** | Presentation + interaction only — **no** authoritative tenant resolution, entitlement, or authorization decisions |
| **Client** | Must not choose authoritative `tenantId`, `phoneNumberId`, or plan limits |
| **Portal** | Must not access WhatsApp app Prisma; ops APIs live on the app host |
| **Logs** | No tokens, signed webhook bodies, passwords, or full session dumps; minimize PII |

---

## 5. Database & tenancy

| Concern | Canonical location |
|---------|-------------------|
| Schema & migrations | `apps/whatsapp-platform/prisma/` |
| Isolation root | `Tenant` |
| Channel credentials | `WhatsappPhoneNumber` (per tenant; tokens server-only) |
| Inbox | `WaInboxThread`, `WaInboxMessage`, queues, notes, audit |
| Billing rows | Subscription / usage models in app schema; rules in `billing-core` |
| Portal CRM | Root/portal `Lead` (and related) — **separate** from WhatsApp DB |
| Legacy messages repos | Deprecated paths in app — do not revive |

Migrations: non-destructive by default; no drops/renames without explicit human approval (`AGENTS.md`).

---

## 6. Primary flows

### 6.1 Webhook inbound

```text
Meta POST
  → signature check
  → normalizeWebhookPayload (whatsapp-core)
  → resolveTenantByPhoneNumberId
  → persist wa_inbox_*
  → optional AI auto-reply / automation / legacy rule fallback
  → webhook health / observability events
```

Impact surfaces: `whatsapp-platform` handlers, `whatsapp-core`, Prisma, observability docs, Meta docs, smoke inbound, sometimes billing quotas.

### 6.2 Inbox / human ops

```text
Authenticated agent (tenant-scoped)
  → list/filter threads
  → read messages
  → assign / notes / tags
  → send outbound (Cloud API)
  → close / reopen (status + audit)
  → React Query cache invalidation / SSE
```

Impact surfaces: conversations modules, tenant resolution, queries, Cloud API, React Query, E2E inbox, a11y.

### 6.3 Outbound

```text
Operator or automation
  → entitlement / channel ACTIVE checks
  → Cloud API send (adapter/helpers)
  → persist outbound message + delivery status updates from webhook
```

### 6.4 Billing

```text
Stripe checkout / portal / webhooks
  → billing-core rules + app handlers
  → subscription & usage state
  → gating in API (and SAAS settings UI)
```

Impact surfaces: `billing-core`, app billing/stripe modules, quotas, settings UI, onboarding, commercial docs.

### 6.5 AI

```text
Inbound (channel ready + AI enabled)
  → guards / safe mode / quotas
  → LLM or rule-based (ai-core + app services)
  → reply or needs_human handoff (PENDING + audit)
```

---

## 7. Mandatory impact map (before editing)

Agents must produce a short impact analysis **before** the first code edit. Minimum fields:

```text
Domain:
App owner:
Core / package potential:
Persistence (schema/state):
Tenant:
Auth / roles:
Auditoria:
UI / cache:
Tests (from quality matrix):
Docs to update:
Explicitly out of scope:
```

### Example — “reopen a closed conversation”

```text
Domain: inbox/conversations
App owner: apps/whatsapp-platform
Core potencial: packages/whatsapp-core (only if pure status rules are shared; else keep in app)
Persistência: verificar schema e estado da conversa (OPEN/PENDING/CLOSED)
Tenant: obrigatório
Auth: agente pertencente ao tenant
Auditoria: registrar reabertura
UI: atualizar cache React Query
Testes: test:node + test:ui + test:e2e:inbox
Docs: inbox operations + CURRENT-SCOPE if capability is new
Fora do escopo: billing, portal público e webhook Meta
```

### Typical blast radius cheatsheet

| Change | Likely surfaces |
|--------|-----------------|
| Webhook | whatsapp-platform, whatsapp-core, Prisma, observability, Meta docs, smoke inbound, maybe billing |
| Plan / entitlement | billing-core, whatsapp-platform, Stripe, quotas, settings UI, onboarding, commercial docs |
| Inbox | conversations, tenant resolution, queries, Cloud API, React Query, E2E inbox, a11y |

---

## 8. Quality gates by change type

Run from `apps/whatsapp-platform` unless noted. Prefer the **minimum** set that proves the change; expand when blast radius grows.

| Change type | Minimum gates |
|-------------|---------------|
| Pure domain (`whatsapp-core`, pure TS in modules) | `pnpm test:node` |
| Component / UI | `pnpm test:ui`, `pnpm lint`, design system (`lint:design-system` / checklist) |
| Inbox | `pnpm test:node`, `pnpm test:ui`, `pnpm test:e2e:inbox` |
| Critical visual flow | E2E relevant + `pnpm test:a11y` (or `test:a11y:product-ui`) |
| Webhook Meta | `pnpm test:node`, `pnpm smoke`, `pnpm ops:check-channel` (env permitting) |
| Billing | `pnpm test:node` (+ package tests in `billing-core`), integration/idempotency review |
| Prisma | `pnpm db:generate`, migration validation per `04-prisma` / skill, tenant isolation tests |
| Design system | visual lint + `pnpm test:a11y:product-ui` |

Also available: `pnpm test`, `pnpm test:coverage`, `pnpm test:e2e`.

---

## 9. Documentation pointers

| Need | Doc |
|------|-----|
| Scope now | [CURRENT-SCOPE.md](./CURRENT-SCOPE.md) |
| Doc classification | [DOCUMENTATION-MAP.md](./DOCUMENTATION-MAP.md) |
| Pilot ops | [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) |
| App layers | `apps/whatsapp-platform/docs/ARCHITECTURE.md` |
| Deploy host | `apps/whatsapp-platform/docs/DEPLOY_APP_SUBDOMAIN.md` |
| Portal parity | `docs/architecture/WHATSAPP_PORTAL_APP_PARITY.md` |
| Webhook hardening | `docs/architecture/WHATSAPP-WEBHOOK-HARDENING.md` |
| CI boundary | `docs/architecture/WHATSAPP-ARCHITECTURE-GUARDRAILS.md` |
| Agent rule / skill | `.cursor/rules/05-whatsapp-platform.mdc`, `.cursor/skills/whatsapp-platform-safe-change.md` |
