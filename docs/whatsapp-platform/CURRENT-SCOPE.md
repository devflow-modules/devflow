# WhatsApp Platform — Current Scope

**Status:** current  
**Last updated:** 2026-07-20  
**Evidence base:** code in `apps/whatsapp-platform` + packages; [WHATSAPP-PLATFORM-AUDIT.md](./WHATSAPP-PLATFORM-AUDIT.md); [WHATSAPP-PLATFORM-P0-BACKLOG.md](./WHATSAPP-PLATFORM-P0-BACKLOG.md); [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md).  
**Supersedes for “what is in product now”:** commercial decks, portal `/demo` copy, and historical sprint notes when they conflict.

This document answers: what is the active product, for whom, what works, what is partial/mock, and what is explicitly deferred.

---

## 1. Active product

**WhatsApp Platform** is a multi-tenant WhatsApp Cloud API operations product:

- Inbound webhook → tenant resolution → inbox persistence
- Human inbox (assign, reply, close, tags, notes, queues)
- Optional AI auto-reply with safe-mode handoff
- Stripe billing / entitlements (SAAS mode)
- Platform admin for channel provisioning and ops

**Canonical runtime:** `apps/whatsapp-platform` (Next.js App Router).  
**Canonical public host:** `NEXT_PUBLIC_WHATSAPP_APP_URL` (webhook + OAuth must match this host).  
**Portal (`src/`):** marketing, acquisition, CRM leads — **not** the operational runtime. Cutover via `packages/whatsapp-routes` + portal proxy (308).

---

## 2. Personas

| Persona | Where they work | Primary jobs |
|---------|-----------------|--------------|
| **Tenant operator / agent** | App `/inbox` | Answer conversations, assign, close |
| **Tenant manager** | App dashboard, settings, agents/queues | Supervise SLA, team, AI pause, billing (SAAS) |
| **Platform admin (DevFlow)** | App `/admin/*` | Provision tenants/channels, affiliates, platform metrics |
| **DevFlow sales / success** | Portal `/admin/leads` + assisted app onboarding | Qualify leads, convert to pilot tenant, run demos |
| **End customer (WhatsApp user)** | WhatsApp | Send/receive messages; never authenticated in the app |

---

## 3. Capabilities (real)

Implemented in the canonical app (require correct env/Meta/Stripe config in each environment):

| Capability | Notes |
|------------|-------|
| Auth (JWT + cookies) | Signup/login/session; roles `operator`, `manager`, `platform_admin` |
| Tenant isolation | Prisma models scoped by `tenantId` |
| Webhook Meta GET verify | `WHATSAPP_VERIFY_TOKEN` |
| Webhook Meta POST inbound | Normalize (`whatsapp-core`) → tenant by `phone_number_id` → `wa_inbox_*` |
| Webhook signature validation | HMAC `X-Hub-Signature-256` (P0-01); prod requires `META_APP_SECRET` |
| Outbound text via Cloud API | Operator send from inbox |
| Inbox list/filters/search | Phases, mine, unassigned, priority |
| Assign / unassign / queue next | Human routing |
| Tags, internal notes, audit log | Plan-gated where applicable |
| Close conversation | Thread status `CLOSED` + audit |
| Realtime SSE | `/api/realtime/stream` |
| AI auto-reply + safe mode | LLM or rule-based; handoff on `needs_human` / low confidence / sensitive topics |
| Automation rules engine | Triggers/actions (assign, tag, send, AI) |
| Embedded Signup / admin channel provision | Needs Meta app config |
| Stripe checkout / portal / webhooks | Needs Stripe config; SAAS mode surfaces billing UI |
| CRM lead capture (portal) | `POST /api/contato/diagnostico` → Lead |
| Assisted lead → tenant link | Admin convert with `convertedToRef` (tenant created separately) |

---

## 4. Partial capabilities

| Item | Reality |
|------|---------|
| SLA | UI tiers (5/15/30 min) exist; per-queue `slaTargetMinutes` runtime usage not fully confirmed |
| FAQ → AI | FAQ CRUD exists; not fully wired into AI reply path (P1) |
| Manager metrics | Manager dashboard real; some overview fields historically stubbed — verify before promising numbers |
| Funnel portal → self-serve tenant | Lead + convert assisted; Stripe self-serve **not** wired to portal funnel |
| Metered billing in production | Code/docs exist; **out of pilot** until explicitly enabled |
| White-label hostname | Product modes exist; dedicated hostname pilot deferred |
| Phone dedupe on contact form | Not implemented (P1) |
| Demo seed/reset automation | Documented; full automation still P1 |

---

## 5. Mocks and non-runtime surfaces

| Surface | Classification | Do not treat as product acceptance |
|---------|----------------|------------------------------------|
| Portal `/demo` | Mock guided demo | Yes — mock |
| Portal landing metrics / ACME dashboards | Static marketing | Yes — mock |
| `NEXT_PUBLIC_DEMO_MODE` showcase fixtures | Local showcase | Distinct from real demo tenant |
| Commercial HTML decks / proposals | Narrative | May overstate readiness |
| `apps/whatsapp-webhook-api` | Legacy / experimental | Not the target for new features |

**Real demo path:** [REAL-APP-DEMO.md](./REAL-APP-DEMO.md) — tenant demo on the canonical app with clearly labeled fictitious data.

---

## 6. Explicitly deferred (not current delivery)

Do not implement these unless the task explicitly expands scope:

- Full self-service (checkout → tenant → Meta) without DevFlow assistance
- Advanced analytics / BI / intent distribution productization
- Marketplace of message templates
- Autonomous AI without human supervision defaults
- Large visual rebrand of portal marketing
- New features on `apps/whatsapp-webhook-api`
- Destructive Prisma migrations without human approval

Pilot “out of scope” list remains authoritative in [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) §2 and [WHATSAPP-PLATFORM-P0-BACKLOG.md](./WHATSAPP-PLATFORM-P0-BACKLOG.md) §2.

---

## 7. Pilot state

| Dimension | State |
|-----------|--------|
| Goal | **1 real client**, 1 tenant, 1 WhatsApp number, assisted ops |
| P0 security/ops items | Largely **completed** in backlog doc (signature, runbooks, handoff, safe mode, LGPD checklist, observability, lead→tenant, real-app demo) |
| Smoke inbound/outbound | **Documented**; environment-specific execution still required before each go-live |
| Ready for unattended multi-tenant scale | **No** — assisted pilot posture |
| Canonical deploy target | Dedicated WhatsApp app host — see `apps/whatsapp-platform/docs/DEPLOY_APP_SUBDOMAIN.md` |

Before real consumer traffic: sign [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) §10 and execute [SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md).

---

## 8. Canonical deploy & surfaces status

| Surface | Path | Status |
|---------|------|--------|
| Canonical product app | `apps/whatsapp-platform` | **active** |
| Shared domain core | `packages/whatsapp-core` | **shared** |
| Shared route/cutover constants | `packages/whatsapp-routes` | **shared** |
| Shared billing rules | `packages/billing-core` | **shared** |
| Shared AI helpers | `packages/ai-core` | **shared** |
| Shared analytics helpers | `packages/analytics-core` | **shared** |
| Portal marketing + CRM | `src/` | **active** (acquisition; not WhatsApp ops DB) |
| Express webhook API | `apps/whatsapp-webhook-api` | **legacy-compatible** — no new product features |

Status vocabulary (also in ARCHITECTURE.md):

- `active` — implement here
- `shared` — reusable contracts/logic; prefer extending over duplicating in the app
- `legacy-compatible` — keep working if required; do not grow
- `migration-source` — read-only reference for ports
- `deprecated` — scheduled removal; do not call from new code
- `historical` — documentation/evidence only

---

## 9. Where new work should land (quick)

| Change type | Default owner |
|-------------|---------------|
| Inbox / conversations / agents UI+API | `apps/whatsapp-platform` (`src/modules/inbox`, `conversations`, …) |
| Pure WhatsApp payload/normalize/retry | `packages/whatsapp-core` |
| Cutover paths / landing constants | `packages/whatsapp-routes` |
| Plan/quota/entitlement pure rules | `packages/billing-core` (compose in app) |
| Portal lead/CRM | `src/` (portal Prisma — **not** WhatsApp Prisma) |
| Webhook Meta | `apps/whatsapp-platform` webhook handlers only |

Full ownership, forbidden imports, and impact maps: [ARCHITECTURE.md](./ARCHITECTURE.md) and `.cursor/skills/whatsapp-platform-safe-change.md`.

---

## 10. Update rule

Any PR that adds, removes, or materially changes a customer-facing capability must update this file in the same change set (or immediately follow-up), and adjust [DOCUMENTATION-MAP.md](./DOCUMENTATION-MAP.md) if new docs appear.
