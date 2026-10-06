# WhatsApp Client 1 — Commercial Readiness Report

**Date:** 2026-10-06  
**Branch:** `feat/whatsapp-client1-commercial-readiness`  
**Base:** `origin/main` @ `0a61625c579af2d8003ed640709ec17e5d3b8677`  
**Environment:** local workspace only — **production not modified**  
**Migrations:** authored; applied only to disposable local PG evidence lab (`npm run test:pg-evidence`) — **not** applied to staging/production  
**External services altered:** none  

---

## A. Baseline

| Item | Value |
|------|--------|
| Initial workspace branch | `feat/applyflow-account-persistence-v2` (ApplyFlow — not used for impl) |
| Implementation branch | `feat/whatsapp-client1-commercial-readiness` tracking `origin/main` |
| Audit | [`WHATSAPP_CLIENT1_GAP_AUDIT.md`](./WHATSAPP_CLIENT1_GAP_AUDIT.md) |
| Working tree | dirty with Client 1 changes (uncommitted) |

---

## B. Audit findings → decisions

| Area | Prior | Gap | Decision |
|------|-------|-----|----------|
| Multi-agent | Model + list; POST 410; implant pack = 1 manager | No customer provision | Manager create + hashed activation token + `/activate` |
| Routing | Manual + queue/next pull | No push auto-assign | Tenant flag + round-robin via `assignThread` CAS |
| Safe AI | Safe mode, guard, suggest | FAQ unwired; auto default true; weak clinical | FAQ grounding; assisted default; dental clinical handoff |

---

## C. Multi-agent onboarding — `3/10 → 9/10`

- **Architecture:** reuse `User` (no second membership model)
- **API:** `POST /api/agents` (manager+); `POST /api/auth/activate`
- **UI:** `/agents` → Adicionar membro; `/activate`
- **Schema:** `status`, `activationTokenHash`, `activationExpiresAt` (additive)
- **Authz:** tenant from session; roles `operator`\|`manager` only; no `platform_admin`
- **Activation:** SHA-256 hashed one-shot token; email via Resend when configured; else manager sees URL once (assisted)
- **Login:** rejects `pending` / `disabled`

---

## D. Routing v1 — `4/10 → 9/10`

- **Algorithm:** round-robin, queue-scoped when `queueId` set else tenant cursor
- **Eligibility:** same tenant, operational role, `status=active`, queue member when queued; **presence ignored in v1**
- **Concurrency:** CAS via `assignThread`; cursor under transaction
- **Fallback:** unassigned + log; inbound never fails
- **Audit:** `source=automatic_routing`, `strategy=round_robin`
- **Config:** `automaticDistributionEnabled` (default false) + System Health toggles

---

## E. Safe AI pilot — `6/10 → 9/10`

- **ASSISTED (default new configs):** `autoReply=false` — suggest-reply only
- **RESTRICTED AUTO:** `autoReply=true` + FAQ match required under safe mode
- **FAQ grounding:** `faqGroundingService` → prompt block (tenant-scoped)
- **Clinical:** dental keywords → `pilot_clinical_topic:*` handoff
- **Ownership:** existing `human_assigned` guard preserved
- **Failure:** AI remains post-persist side effect
- **Multi-tenant parity (follow-up from Phase C audit):** plain-text `generateReply` path now goes through `resolveStructuredLlmDecision` + `commitAiDecision` (no blind auto-send)

---

## F. Tests (evidence) — release gate 2026-10-06

| Command | Result | Notes |
|---------|--------|-------|
| Focused A/B/C (9 files) | **92 passed** | provisioning, agents, assignment, queue next, routing/FAQ, AI |
| `tsc --noEmit` | **pass / 0** | |
| `npm run lint` | **pass** (0 errors, 7 warnings) | warnings pre-existing |
| `npm run test:node` (`NODE_ENV=test`) | **1229 passed**, 13 skipped | earlier failures under `NODE_ENV=production` were env contamination |
| `npm run test:ui` | **166 passed** | |
| `npx prisma generate` + `npx next build` | **pass** | use PowerShell `NODE_ENV`; npm `build` script fails on Windows `NODE_ENV=` syntax |
| `node scripts/block-native-button.mjs` | **pass** | |
| `npm run test:pg-evidence` | **13 passed** | disposable local PG; includes Client 1 migrations |
| Staging Meta smoke / Playwright E2E | **not run** | human + staging |

---

## G. Migration status

| Migration | Destructive? | Status |
|-----------|--------------|--------|
| `20261006200000_client1_team_routing_readiness` | No (additive) | Authored; applied in disposable PG evidence lab only — **not** staging/prod |
| `20261006201000_ai_assisted_default_auto_reply` | No (default only) | Authored; applied in disposable PG evidence lab only — **not** staging/prod |

**Deploy order:** apply WhatsApp Prisma migrations in staging before enabling Client 1 traffic. Existing users → `status=active` via DEFAULT. Existing AI configs keep their `auto_reply` value.

---

## H. Remaining gaps

| Item | Class |
|------|-------|
| Staging Meta inbound/outbound smoke | **BLOCKER before Client 1 go-live** (ops, not code) |
| LGPD / ownership Meta sign-off | **BLOCKER before production traffic** |
| Apply migrations in staging/prod | **BLOCKER before using new fields** |
| Unified E2E Clínica Aurora fixture | **P1** (composed focused evidence exists; single E2E not required for Client 1) |
| Disable-member UI (status=disabled API) | **P1** (schema ready; UI/API disable not fully exposed) |
| Email always-on for activation | **P2** (assisted URL works without Resend) |
| Weighted / skills routing | **intentionally deferred** |
| Autonomous clinical AI | **intentionally deferred / forbidden** |

---

## I. Commercial readiness verdict

### GO WITH CONDITIONS

Client 1 **can** be onboarded under the assisted pilot **after**:

1. Migrations applied in the target non-prod/prod WhatsApp DB (with approval).
2. Staging smoke inbound/outbound passes.
3. Meta ownership + LGPD checklist signed.
4. Manager trained on `/agents` + distribution toggle + AI assisted mode.

Human inbox remains the product core if AI is fully off.

---

## J. Commercial claims

### SAFE TO SAY

- Shared WhatsApp inbox for teams
- Conversation owner + manager transfer
- Manager adds operators without DB edits
- Optional round-robin routing (pilot policy)
- Assignment history audited
- AI assists on approved low-risk FAQ; clinical/uncertain → human
- Clinic keeps its dental ERP
- Assisted DevFlow onboarding

### DO NOT SAY YET

- AI replaces receptionist / clinical guidance
- 100% automatic support / never lose conversations
- Advanced SLA analytics / ERP integrations / unlimited scale
- Fully autonomous onboarding / performance-based routing

---

## K. Next recommended action

**CODE FREEZE on feature scope** → review PR → staging migrate → real inbound/outbound smoke → real-app demo → final pilot offer → distribution (Instagram/LinkedIn) → first 5 prospects → Client 1.

Do **not** start another feature sprint before smoke evidence.
