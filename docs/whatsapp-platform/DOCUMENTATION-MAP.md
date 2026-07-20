# WhatsApp Platform — Documentation Map

**Status:** current  
**Last updated:** 2026-07-20  
**Purpose:** classify WhatsApp documentation across the monorepo, declare sources of truth, and resolve conflicts.

This map does **not** move files. It records the intended division of ownership so agents and humans know which document wins.

---

## 1. Intended doc trees

| Tree | Responsibility | Status |
|------|----------------|--------|
| `docs/whatsapp/` | Ecosystem positioning, portal/CRM integration, Meta ops playbooks shared with commercial/ops | **active** (mixed ages; classify per file) |
| `docs/whatsapp-platform/` | Product scope, cross-cutting architecture, pilot, billing/inbox product docs, governance | **active** — canonical product index |
| `apps/whatsapp-platform/docs/` | Runtime-specific architecture, deploy, security, billing implementation, testing, design system | **active** — canonical for app runtime |
| `docs/architecture/WHATSAPP-*` | Platform cutover, auth/billing validation, webhook hardening, portal↔app parity | **active** for platform boundaries |
| `.cursor/rules/05-whatsapp-platform.mdc` + `.cursor/skills/whatsapp-platform-safe-change.md` | Agent governance (ownership, impact map, gates) | **active** |

### Conflict resolution

When two documents disagree:

1. **Code + tests** in `apps/whatsapp-platform` (and relevant packages) win over docs.
2. Among docs, prefer in this order:
   1. `docs/whatsapp-platform/CURRENT-SCOPE.md` (what is in/out of product now)
   2. `docs/whatsapp-platform/ARCHITECTURE.md` (ownership, boundaries, flows)
   3. Runtime docs under `apps/whatsapp-platform/docs/` for deploy, Prisma, API contracts, design system
   4. Platform boundary docs under `docs/architecture/WHATSAPP-*` / `WHATSAPP_PORTAL_APP_PARITY.md`
   5. Domain product notes in `docs/whatsapp-platform/` (inbox, billing, AI)
   6. Ecosystem / commercial notes in `docs/whatsapp/`
3. Documents marked **historical**, **audit**, or **completed backlog** never override current scope/architecture unless explicitly promoted.
4. If still ambiguous: stop and ask — do not invent a product rule.

---

## 2. Classification labels

| Label | Meaning |
|-------|---------|
| `current` | Describes the intended present state; keep updated with code changes |
| `runbook` | Operational procedure (env, Meta, smoke, incident) |
| `audit` | Point-in-time assessment; evidence, not living product spec |
| `backlog` | Planned work; status fields may be stale — verify in code |
| `historical` | Sprint notes, migration inventory, closed cutovers; do not implement from these alone |
| `commercial` | Sales/demo/proposal narrative; may overstate runtime readiness |
| `completed` | Work finished; retained for traceability |

---

## 3. Canonical entry points (read first)

| Topic | Canonical doc |
|-------|----------------|
| Documentation index / this map | [DOCUMENTATION-MAP.md](./DOCUMENTATION-MAP.md) |
| What the product is / is not today | [CURRENT-SCOPE.md](./CURRENT-SCOPE.md) |
| Ownership, packages, flows, trust boundaries | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Pilot go-live procedure | [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) |
| App deploy / webhook host | `apps/whatsapp-platform/docs/DEPLOY_APP_SUBDOMAIN.md` |
| App runtime layers | `apps/whatsapp-platform/docs/ARCHITECTURE.md` |
| Portal ↔ app cutover | `docs/architecture/WHATSAPP_PORTAL_APP_PARITY.md`, `packages/whatsapp-routes` |
| Webhook hardening | `docs/architecture/WHATSAPP-WEBHOOK-HARDENING.md` |
| Design system | `apps/whatsapp-platform/docs/DESIGN_SYSTEM.md` |
| Agent rules | `.cursor/rules/05-whatsapp-platform.mdc` |
| Agent safe-change skill | `.cursor/skills/whatsapp-platform-safe-change.md` |

---

## 4. `docs/whatsapp-platform/` — product & pilot

| Document | Class | Notes |
|----------|-------|-------|
| [README.md](./README.md) | `current` | Index; points to canonical docs |
| [DOCUMENTATION-MAP.md](./DOCUMENTATION-MAP.md) | `current` | This file |
| [CURRENT-SCOPE.md](./CURRENT-SCOPE.md) | `current` | Active product scope |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | `current` | Cross-cutting architecture & ownership |
| [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) | `runbook` | Primary pilot procedure |
| [SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md) | `runbook` | E2E smoke for pilot |
| [LEAD-TO-TENANT-PILOT.md](./LEAD-TO-TENANT-PILOT.md) | `runbook` | CRM lead → tenant assisted flow |
| [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) | `runbook` | Operational privacy checklist (not legal opinion) |
| [OBSERVABILITY-PILOT.md](./OBSERVABILITY-PILOT.md) | `runbook` / `current` | Minimum pilot logging events |
| [REAL-APP-DEMO.md](./REAL-APP-DEMO.md) | `runbook` / `commercial` | Demo on real app (not portal mock) |
| [INBOX_OPERATIONS.md](./INBOX_OPERATIONS.md) | `current` | Inbox ops product notes |
| [INBOX_UI.md](./INBOX_UI.md) | `current` | Inbox UI / React Query |
| [INBOX_COLLABORATION.md](./INBOX_COLLABORATION.md) | `current` | Multi-agent collaboration |
| [INBOX_REALTIME.md](./INBOX_REALTIME.md) | `current` | SSE / realtime |
| [INBOX_PORT_MULTI_TENANT.md](./INBOX_PORT_MULTI_TENANT.md) | `current` / `historical` | Port notes; prefer CURRENT-SCOPE + app docs if drift |
| [AI_AUTOMATION.md](./AI_AUTOMATION.md) | `current` | AI automation product behavior |
| [AUTOMATION_ENGINE.md](./AUTOMATION_ENGINE.md) | `current` | Rules engine |
| [BILLING.md](./BILLING.md) | `current` | Billing product overview |
| [BILLING_PLANS.md](./BILLING_PLANS.md) | `current` | Plans / entitlements narrative |
| [BILLING_AND_GATING.md](./BILLING_AND_GATING.md) | `current` | Feature gating |
| [METERED_BILLING.md](./METERED_BILLING.md) | `current` | Metered usage (verify production readiness in CURRENT-SCOPE) |
| [STRIPE_INTEGRATION.md](./STRIPE_INTEGRATION.md) | `current` | Stripe integration product notes |
| [SAAS_METRICS.md](./SAAS_METRICS.md) | `current` | SaaS metrics notes |
| [ONBOARDING_BILLING_SPRINT.md](./ONBOARDING_BILLING_SPRINT.md) | `historical` / `completed` | Sprint notes |
| [IMPLEMENTATION_MODE_LOCKDOWN.md](./IMPLEMENTATION_MODE_LOCKDOWN.md) | `current` | Implementation mode constraints |
| [UNIFICACAO_APP_RAIZ.md](./UNIFICACAO_APP_RAIZ.md) | `historical` | Unification narrative; cutover already in packages/routes |
| [WHATSAPP-PLATFORM-AUDIT.md](./WHATSAPP-PLATFORM-AUDIT.md) | `audit` | Maturity audit (2026-06-09); evidence base for CURRENT-SCOPE |
| [WHATSAPP-PLATFORM-P0-BACKLOG.md](./WHATSAPP-PLATFORM-P0-BACKLOG.md) | `backlog` / `completed` | P0 items mostly completed — verify status fields |
| [PRODUCT-UI-AUDIT.md](./PRODUCT-UI-AUDIT.md) | `audit` | Visual audit vs Product UI System |

---

## 5. `docs/whatsapp/` — ecosystem, commercial, Meta ops

| Document | Class | Notes |
|----------|-------|-------|
| [README.md](../whatsapp/README.md) | `current` (partial) | Local status table; prefer CURRENT-SCOPE for product truth |
| [WHATSAPP-PLATFORM-OVERVIEW.md](../whatsapp/WHATSAPP-PLATFORM-OVERVIEW.md) | `commercial` / `current` | Positioning |
| [DEMO_AND_CLIENT_READINESS_PLAYBOOK.md](../whatsapp/DEMO_AND_CLIENT_READINESS_PLAYBOOK.md) | `commercial` / `runbook` | Sales demo readiness |
| [PROSPECT_CRM_PLAYBOOK.md](../whatsapp/PROSPECT_CRM_PLAYBOOK.md) | `current` | Portal CRM prospecting on inbox |
| [MANUAL_OUTREACH_20_LEADS.md](../whatsapp/MANUAL_OUTREACH_20_LEADS.md) | `commercial` / `runbook` | Outbound campaign |
| [OPERATIONAL_PLAYBOOK.md](../whatsapp/OPERATIONAL_PLAYBOOK.md) | `runbook` | Assisted onboarding (complement PILOT-RUNBOOK) |
| [WHATSAPP-SETUP.md](../whatsapp/WHATSAPP-SETUP.md) | `runbook` | Meta / Cloud API setup |
| [WHATSAPP_CLOUD_ONBOARDING_SPRINT.md](../whatsapp/WHATSAPP_CLOUD_ONBOARDING_SPRINT.md) | `historical` / `runbook` | Graph registration sprint |
| [WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md](../whatsapp/WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md) | `runbook` | Real activation curls / checklist |
| [GRAPH_API_DIAGNOSTIC.md](../whatsapp/GRAPH_API_DIAGNOSTIC.md) | `runbook` | WABA / phone diagnostics |
| [WEBHOOK_META_CHECKLIST.md](../whatsapp/WEBHOOK_META_CHECKLIST.md) | `runbook` | Meta Dashboard checklist |
| [WEBHOOK_SUBSCRIPTION_FIX.md](../whatsapp/WEBHOOK_SUBSCRIPTION_FIX.md) | `historical` / `runbook` | `subscribed_apps` fix |
| [WEBHOOK_CONFIG_AUDIT.md](../whatsapp/WEBHOOK_CONFIG_AUDIT.md) | `audit` | Webhook config audit |
| [WEBHOOK_DEBUG_AUDIT.md](../whatsapp/WEBHOOK_DEBUG_AUDIT.md) | `audit` | Debug audit |
| [WEBHOOK_CONVERSATIONS_FIX.md](../whatsapp/WEBHOOK_CONVERSATIONS_FIX.md) | `historical` | Closed fix notes |
| [WHATSAPP_WEBHOOK_AND_SENDTEXT_SPRINT.md](../whatsapp/WHATSAPP_WEBHOOK_AND_SENDTEXT_SPRINT.md) | `historical` | Sprint notes |
| [WHATSAPP_CONVERSATIONS_AND_MESSAGES.md](../whatsapp/WHATSAPP_CONVERSATIONS_AND_MESSAGES.md) | `historical` / `current` | Prefer app inbox docs + CANONICAL_MESSAGING |
| [WHATSAPP_QUEUES_AND_AGENTS.md](../whatsapp/WHATSAPP_QUEUES_AND_AGENTS.md) | `historical` / `current` | Prefer app operational queues docs |
| [WHATSAPP_AI_LLM.md](../whatsapp/WHATSAPP_AI_LLM.md) | `current` (thin) | Prefer AI_AUTOMATION.md + ai-core |
| [OPENAI_ENV_AND_FLOW.md](../whatsapp/OPENAI_ENV_AND_FLOW.md) | `runbook` | LLM env |
| [OPENAI_SPRINT_PLAN.md](../whatsapp/OPENAI_SPRINT_PLAN.md) | `historical` / `backlog` | Sprint plan |
| [PLATFORM-ADMIN-AND-CHANNEL-OPERATIONS.md](../whatsapp/PLATFORM-ADMIN-AND-CHANNEL-OPERATIONS.md) | `runbook` / `current` | Admin channel ops |
| [DEVFLOW-SALES-TENANT.md](../whatsapp/DEVFLOW-SALES-TENANT.md) | `runbook` | Sales tenant provisioning |
| [DATA-ISOLATION-LEADS-AND-OPERATORS.md](../whatsapp/DATA-ISOLATION-LEADS-AND-OPERATORS.md) | `current` | Isolation notes (CRM vs ops) |
| [PRODUCTION_CHECKLIST.md](../whatsapp/PRODUCTION_CHECKLIST.md) | `runbook` | Prod checklist (cross-check PILOT-RUNBOOK) |
| [PRODUCT-METRICS-DASHBOARD-WHATSAPP.md](../whatsapp/PRODUCT-METRICS-DASHBOARD-WHATSAPP.md) | `commercial` / `backlog` | Metrics narrative |
| [CONFORMIDADE_META.md](../whatsapp/CONFORMIDADE_META.md) | `current` | Meta compliance notes |
| [COMMERCIAL_IMPLEMENTATION_PROPOSAL.md](../whatsapp/COMMERCIAL_IMPLEMENTATION_PROPOSAL.md) | `commercial` | Proposal; not runtime truth |
| [COMMERCIAL_MULTI_CHANNEL_DEMO.md](../whatsapp/COMMERCIAL_MULTI_CHANNEL_DEMO.md) | `commercial` | Multi-channel demo narrative |
| [WHATSAPP_PLATFORM_MIGRATION.md](../whatsapp/WHATSAPP_PLATFORM_MIGRATION.md) | `historical` | Migration plan |
| [WHATSAPP_PLATFORM_MIGRATION_INVENTORY.md](../whatsapp/WHATSAPP_PLATFORM_MIGRATION_INVENTORY.md) | `historical` | Inventory |
| [WHATSAPP_PLATFORM_REAL_INTEGRATION.md](../whatsapp/WHATSAPP_PLATFORM_REAL_INTEGRATION.md) | `historical` / `audit` | Integration notes |
| [RELEASE_NOTES.md](../whatsapp/RELEASE_NOTES.md) | `historical` | Release notes |
| [MIGRATION_CONSOLIDATED.sql](../whatsapp/MIGRATION_CONSOLIDATED.sql) | `historical` | Consolidated SQL — prefer Prisma migrations in app |

---

## 6. `apps/whatsapp-platform/docs/` — runtime & deploy

| Document / area | Class | Notes |
|-----------------|-------|-------|
| [ARCHITECTURE.md](../../apps/whatsapp-platform/docs/ARCHITECTURE.md) | `current` | App layers (`src/app`, modules, lib, prisma) |
| [DEPLOY_APP_SUBDOMAIN.md](../../apps/whatsapp-platform/docs/DEPLOY_APP_SUBDOMAIN.md) | `current` / `runbook` | Canonical host for webhook/OAuth |
| [PLANO_TRANSICAO_APP_SUBDOMINIO.md](../../apps/whatsapp-platform/docs/PLANO_TRANSICAO_APP_SUBDOMINIO.md) | `historical` / `runbook` | Transition plan |
| [WEBHOOK_MIGRACAO_META.md](../../apps/whatsapp-platform/docs/WEBHOOK_MIGRACAO_META.md) | `runbook` / `historical` | Meta webhook URL migration |
| [API_CONTRACT.md](../../apps/whatsapp-platform/docs/API_CONTRACT.md) | `current` | HTTP contracts |
| [SECURITY-MODEL.md](../../apps/whatsapp-platform/docs/SECURITY-MODEL.md), [SECURITY_CHECKLIST.md](../../apps/whatsapp-platform/docs/SECURITY_CHECKLIST.md) | `current` | Security |
| [PRODUCT_MODE.md](../../apps/whatsapp-platform/docs/PRODUCT_MODE.md), [WHITE_LABEL_STRATEGY.md](../../apps/whatsapp-platform/docs/WHITE_LABEL_STRATEGY.md) | `current` | SAAS vs WHITE_LABEL |
| [DESIGN_SYSTEM.md](../../apps/whatsapp-platform/docs/DESIGN_SYSTEM.md), [VISUAL_REVIEW_CHECKLIST.md](../../apps/whatsapp-platform/docs/VISUAL_REVIEW_CHECKLIST.md) | `current` | UI system |
| [TESTING.md](../../apps/whatsapp-platform/docs/TESTING.md) | `current` | Test strategy |
| [ops/*](../../apps/whatsapp-platform/docs/ops/) | `runbook` | ENVIRONMENT, GO_LIVE, INCIDENT_RESPONSE |
| [billing/*](../../apps/whatsapp-platform/docs/billing/), BILLING_* | `current` | Billing implementation |
| [product/INBOX_STATE_MACHINE.md](../../apps/whatsapp-platform/docs/product/INBOX_STATE_MACHINE.md) | `current` | Conversation states |
| [architecture/*](../../apps/whatsapp-platform/docs/architecture/) | `current` | Ownership, queues, legacy cleanup |
| [whatsapp-platform/CANONICAL_MESSAGING.md](../../apps/whatsapp-platform/docs/whatsapp-platform/CANONICAL_MESSAGING.md) | `current` | Canonical messaging model |
| [DEMO-WALKTHROUGH.md](../../apps/whatsapp-platform/docs/DEMO-WALKTHROUGH.md), SHOWCASE-REVIEW | `commercial` / `runbook` | Showcase / demo mode |
| [gtm/*](../../apps/whatsapp-platform/docs/gtm/) | `commercial` / `historical` | GTM sprint artifacts |
| [RECRUITER-ARCHITECTURE.md](../../apps/whatsapp-platform/docs/RECRUITER-ARCHITECTURE.md) | `historical` / niche | Recruiter-specific notes |
| [APRESENTACAO_CLIENTES_WHATSAPP_PLATFORM.html](../../apps/whatsapp-platform/docs/APRESENTACAO_CLIENTES_WHATSAPP_PLATFORM.html) | `commercial` | Client deck |

---

## 7. `docs/architecture/` — platform boundaries (WhatsApp)

| Document | Class | Notes |
|----------|-------|-------|
| [WHATSAPP_PORTAL_APP_PARITY.md](../architecture/WHATSAPP_PORTAL_APP_PARITY.md) | `current` | Portal ↔ app parity |
| [WHATSAPP-ARCHITECTURE-GUARDRAILS.md](../architecture/WHATSAPP-ARCHITECTURE-GUARDRAILS.md) | `current` | CI boundary guard |
| [WHATSAPP-WEBHOOK-HARDENING.md](../architecture/WHATSAPP-WEBHOOK-HARDENING.md) | `current` | Webhook security contract |
| [CUTOVER-WHATSAPP-RUNBOOK-MAIN.md](../architecture/CUTOVER-WHATSAPP-RUNBOOK-MAIN.md) | `runbook` / `historical` | Cutover main |
| [WHATSAPP-CUTOVER-HOMOLOGACAO.md](../architecture/WHATSAPP-CUTOVER-HOMOLOGACAO.md) | `historical` / `completed` | Homologation |
| [WHATSAPP-AUTH-*](../architecture/) | `audit` / `runbook` | Auth validation matrix & smoke |
| [WHATSAPP-BILLING-VALIDATION.md](../architecture/WHATSAPP-BILLING-VALIDATION.md) | `audit` / `runbook` | Billing validation |
| [WHATSAPP-OBSERVABILITY*.md](../architecture/) | `current` / `runbook` | Observability standards |
| [WHATSAPP-PRODUCTION-SIGNOFF.md](../architecture/WHATSAPP-PRODUCTION-SIGNOFF.md), SPRINT-* | `historical` / `completed` | Sign-off artifacts |
| [WHATSAPP-UX-READY-CHECKLIST.md](../architecture/WHATSAPP-UX-READY-CHECKLIST.md) | `audit` / `runbook` | UX readiness |
| [WHATSAPP-PRE-SMOKE-AUTOMATION.md](../architecture/WHATSAPP-PRE-SMOKE-AUTOMATION.md) | `runbook` | Pre-smoke automation |

---

## 8. Update rules

1. **New product capability** → update `CURRENT-SCOPE.md` in the same PR (or immediately after).
2. **New ownership / package / boundary** → update `ARCHITECTURE.md` and `.cursor/rules/05-whatsapp-platform.mdc`.
3. **New or renamed doc** → add a row here with a classification label.
4. **Closing a backlog item** → mark backlog status; do not delete historical evidence.
5. **Do not** treat commercial decks or portal `/demo` copy as acceptance criteria for runtime work.
6. **Do not** implement new features in `apps/whatsapp-webhook-api` — see surface status in ARCHITECTURE.md.

---

## 9. Related Cursor governance

| Artifact | Role |
|----------|------|
| `.cursor/rules/05-whatsapp-platform.mdc` | Ownership, surface status, boundaries, quality gate pointers |
| `.cursor/rules/whatsapp-platform-design.mdc` | Visual tokens / components (unchanged by this map) |
| `.cursor/skills/whatsapp-platform-safe-change.md` | Mandatory impact map + gates before editing |
| `AGENTS.md` (repo root) | Monorepo-wide agent behavior |
| `ARCHITECTURE.md` (repo root) | Monorepo architecture |
