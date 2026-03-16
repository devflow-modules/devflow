# WhatsApp Cloud Platform — migration summary

## Phase 1 — Current state (workspace)

**Real production logic** was located at repo root: `src/modules/whatsapp/` and `src/app/api/webhook/whatsapp/`. It has been ported into `apps/whatsapp-platform` and wired to Supabase, webhook flow, and ops metrics.

- **apps/whatsapp-platform:** Full integration — webhook (GET verify + POST process), tenant resolution, persistence (Supabase), rule-based replies, ops metrics, dashboard with real data.
- **packages/whatsapp-core:** Types, normalizeWebhookPayload, WhatsAppCloudAdapter, retry, status.
- **packages/ai-core:** LLMProvider, classifyIntent, formatResponse, fallback, safety.

See **docs/WHATSAPP_PLATFORM_REAL_INTEGRATION.md** for what was ported, DB schema, env vars, and known gaps.

---

## Internal architecture summary (target)

### Entrypoints

- **App:** Next.js App Router — `apps/whatsapp-platform/src/app/`.
- **Webhook:** `POST /api/webhooks/whatsapp` — ingest WhatsApp Cloud API webhooks.
- **Health:** `GET /api/health` — liveness.
- **Ops:** `GET /api/ops/metrics` — contract for apps/ops.

### Flow (high level)

1. **Webhook:** Incoming payload → normalize (whatsapp-core) → identify tenant → store event → process message → enqueue AI if needed → reply via WhatsApp API (whatsapp-core).
2. **AI:** Message → classify intent (ai-core) → conversation context → build prompt (app-specific) → LLM (ai-core adapter) → response → send (whatsapp-core).
3. **Data:** Own Supabase project; tables: tenants, conversations, messages, agents, queues, events, webhook_logs. Use `@devflow/supabase-utils` for clients.

### Boundaries

- **packages/whatsapp-core:** Message types, webhook payload normalization, Cloud API adapters, send message, retry helpers, status helpers. No tenant/product logic.
- **packages/ai-core:** LLM adapters, prompt builders (generic), intent classification, response formatting, safety/fallback. No product-specific prompts.
- **apps/whatsapp-platform/modules:** tenants, conversations, messaging, queues, ai (orchestration + product prompts), analytics, domain. All product and DB logic here.

---

## Extracted shared packages

| Package | Contents |
|--------|-----------|
| **whatsapp-core** | Types (IncomingMessage, WebhookPayload, etc.), normalizeWebhookPayload(), WhatsAppCloudAdapter (send, mark read), retryWithBackoff(), message status helpers. |
| **ai-core** | LLMProvider interface, buildPrompt (generic), classifyIntent(), formatResponse(), fallback/safety helpers. |

---

## Final app structure

```
apps/whatsapp-platform/
  src/
    app/
      layout.tsx
      page.tsx
      globals.css
      api/
        health/route.ts
        ops/metrics/route.ts
        webhooks/whatsapp/route.ts
      dashboard/
      conversations/
      agents/
      queues/
      settings/
    components/
    lib/
    modules/
      auth/
      tenants/
      conversations/
      messaging/
      queues/
      ai/
      analytics/
      domain/
    middleware.ts
```

---

## Modules (product)

| Module | Responsibility |
|--------|----------------|
| auth | Session, protected routes (Supabase via supabase-utils). |
| tenants | Tenant CRUD, configuration, settings. |
| conversations | Lifecycle, assignment, state. |
| messaging | Message persistence, link to conversations, metadata. |
| queues | Queue routing, agent assignment, priorities. |
| ai | Product-specific orchestration, prompts, call ai-core. |
| analytics | Conversation/agent/usage metrics; use @devflow/analytics-core. |
| domain | Product business logic. |

---

## Integration with whatsapp-core

- Webhook route: `normalizeWebhookPayload(payload)` → typed event; then `WhatsAppCloudAdapter.send()`, `markRead()`, etc.
- Message types imported from `@devflow/whatsapp-core`.
- Retry: `retryWithBackoff(fn)` for send/API calls.
- No tenant or conversation logic in the package.

---

## Integration with ai-core

- modules/ai: import `classifyIntent()`, `LLMProvider`, `formatResponse()`, fallback from `@devflow/ai-core`.
- Product prompts and conversation context built in the app; passed to ai-core for execution.
- No product-specific prompt text in ai-core.

---

## Ops metrics implementation

- **Endpoint:** `GET /api/ops/metrics`
- **Response:** `{ product: "whatsapp-platform", users, activeSubscriptions, pendingCancellation, mrr, tenants, conversations, messagesLast24h }`
- **Source:** App’s Supabase (and optional billing); aggregates from tenants, conversations, messages. Required keys per contract; extra keys allowed for future use.

---

## Validation report

| Check | Status |
|-------|--------|
| App build | OK — `pnpm run build` / `turbo run build --filter=@devflow/app-whatsapp-platform` |
| Boundary rules | OK — ESLint `no-restricted-imports` (apps não importam apps; packages não importam apps) |
| Imports | OK — Apenas `@devflow/*` e `@/*` no app |
| Health | OK — `GET /api/health` retorna `{ status: "ok", app: "whatsapp-platform" }` |
| Ops metrics | OK — `GET /api/ops/metrics` retorna contrato (product, users, tenants, conversations, messagesLast24h, etc.) |
| Lint (src only) | OK — `eslint apps/whatsapp-platform/src` passa (app usa `lint: "eslint src"`) |

**Nota:** Testes existentes do monorepo (financeiro, billing-core, etc.) não foram alterados; o whatsapp-platform não possui testes próprios ainda.
