# WhatsApp Client 1 — Gap Audit

**Status:** historical pre-implementation audit (2026-10-06) — **superseded for current runtime by** [`WHATSAPP_CLIENT1_READINESS_REPORT.md`](./WHATSAPP_CLIENT1_READINESS_REPORT.md) and [`CURRENT-SCOPE.md`](./CURRENT-SCOPE.md).  
Do not treat section B “assumption vs reality” rows as live product truth after Client 1 implementation.  
**Method (original):** read-only code + docs inspection (no production changes)  
**Runtime owner:** `apps/whatsapp-platform`  
**Canonical repo:** `devflow-modules/devflow`

---

## A. Baseline

| Item | Value |
|------|--------|
| Audit branch (workspace at start) | `feat/applyflow-account-persistence-v2` |
| Initial HEAD | `a014072ede7d3dea4d56dccaab6b6c74bb232653` |
| Remote | `origin` → `https://github.com/devflow-modules/devflow.git` |
| Working tree at audit | clean |
| Implementation branch policy | **Do not implement on ApplyFlow branch.** Cut a dedicated branch from `origin/main` before code changes. |

### Docs inspected

- `docs/whatsapp-platform/CURRENT-SCOPE.md`
- `docs/whatsapp-platform/WHATSAPP-PLATFORM-AUDIT.md` (stale in places — see drift)
- `docs/whatsapp-platform/WHATSAPP-CLIENT-1-READINESS-PLAN.md`
- `docs/whatsapp-platform/CLIENT-IMPLANTATION-PACK-v1.md`
- `docs/whatsapp-platform/AI_AUTOMATION.md`
- `apps/whatsapp-platform/docs/architecture/OPERATIONAL_QUEUES_CANONICAL.md`
- `apps/whatsapp-platform/docs/architecture/CONVERSATION_OWNERSHIP_AND_HANDOFF.md` (referenced; ownership code confirmed)

### Code areas inspected

- Prisma: `User`, `Tenant`, `TenantOperationalConfig`, `WaInboxQueue*`, `WaInboxThread`, `FAQ`, `AiAgentConfig`, `EmailMessage`
- Auth: signup/login/session, password reset JWT, `sendTransactionalEmail` (Resend)
- Agents: `/agents`, `/api/agents`, `operationsAgentsService`
- Ownership: `threadAssignmentService`, `inboxQueueNext`, assign routes
- Inbound: `webhookHandler` → `persistWaInboxFromWebhook` → optional AI
- AI: `aiAutomationService`, `aiGuard`, `aiPilotDecision`, `suggest-reply`, FAQ API
- Ops script: `scripts/provision-devflow-sales-tenant.ts`

---

## B. Drift vs prompt / stale docs

| Assumption in prompt or old docs | Current code reality |
|----------------------------------|----------------------|
| Webhook HMAC missing (`WHATSAPP-PLATFORM-AUDIT.md` 2026-06-09) | **Stale.** CURRENT-SCOPE + P0 backlog mark signature validation as done. Code path exists; do not re-open as Client 1 work. |
| Multi-agent “technically supported” | **True for data model** (N `User` per tenant). **False for customer workflow** — no manager self-serve provision UI/API. |
| Round-robin / auto distribution | **Not implemented.** Docs explicitly say “when it exists”. |
| FAQ → AI | **Still incomplete.** FAQ CRUD exists; AI modules do not read FAQ. |
| Assisted AI as pilot default | **Partial.** `AiAgentConfig.autoReply` + `suggest-reply` exist; pilot docs want assisted default, but `autoReply` defaults to `true`. |
| Client 1 implant pack | Explicitly **1 manager + 1 number**; operator invite **out of minimum path** / “não resolver por banco”. |

**Rule applied:** current runtime code wins over stale audit narrative.

---

## C. Phase A — Multi-agent onboarding

### Prior state (what exists)

| Capability | Evidence | Status |
|------------|----------|--------|
| Tenant-scoped `User` | `schema.prisma` `User` → `whatsapp_users`; `tenantId` + `@@index([tenantId])` | Real |
| Global unique email | `email String @unique` | Real — cross-tenant collision must be explicit |
| Roles | `operator` \| `manager` \| `platform_admin` | Real |
| Password hashing + JWT session | signup/login + `UserSession` | Real |
| Signup creates **new tenant + first manager** | `api/auth/signup` | Real — not “add operator to existing tenant” |
| List team | `GET /api/agents` + `/agents` UI | Real (manager+) |
| Presence status PATCH | `PATCH /api/agents/[id]` | Real |
| Create agent via API | `POST /api/agents` → **410** | Explicitly refused |
| Settings user CRUD | `/settings` has tenant/AI/billing — **no team provision form** | Gap (UI copy points here incorrectly) |
| Ops provision script | `ops:provision-devflow-sales` can create manager+operator with passwords | Assisted DevFlow-only |
| Email infra | `sendTransactionalEmail` + Resend + `EmailMessage` + reset-password JWT | Reusable |
| User lifecycle (pending/disabled) | No `status` / `disabledAt` on `User` | Missing |

### Confirmed gap

Manager of a clinic tenant **cannot** provision Operator A/B without:

1. DevFlow running a script / SQL, or  
2. Abuse of signup (creates another tenant), or  
3. Manual DB edit.

`CLIENT-IMPLANTATION-PACK-v1.md` documents this as intentional exclusion of the minimum path — which is exactly the commercial gap for “1 manager + 2 operators”.

### Implementation decision (minimal secure)

**Pattern B+C hybrid — manager-created operator + single-use activation (reuse reset-password / email stack):**

1. `POST /api/agents` (or `/api/team/members`) manager+: name, email, role ∈ `{operator}` (optional `manager` only if product allows; **never** `platform_admin` from tenant manager).
2. Server derives `tenantId` from session only.
3. Create user in caller tenant with:
   - random unusable password hash **or** additive `status=pending` + activation token hash;
   - prefer additive fields: `status` (`pending` \| `active` \| `disabled`) + `activationTokenHash` + `activationExpiresAt`.
4. Issue single-use activation (JWT or hashed token) → email if Resend configured; else return **one-time activation URL** to manager UI (assisted pilot acceptable when email not configured).
5. Activation page: set password → `status=active`.
6. UI: `/agents` primary CTA **Adicionar membro** (replace misleading “use Configurações”).
7. Duplicate email:
   - same tenant → 409 deterministic;
   - other tenant → 409 “email already registered” (no silent move);
   - pending/expired same tenant → refresh or 409 per explicit policy.

**Do not:** second membership model, SSO, SCIM, platform_admin creation by managers.

### Schema / API / UI / tests

| Layer | Change |
|-------|--------|
| Schema | Additive `User.status` (+ optional activation fields) — non-destructive |
| API | Replace 410 POST with provision; activation endpoint; login rejects `pending`/`disabled` |
| UI | `/agents` add-member dialog + status column |
| Tests | Provision authz, tenant injection, duplicate email, activate, list isolation, claim/transfer with new operator |

### Readiness score

**3/10 → target 9/10** after implementation  
(Justification: list/roles/ownership exist; customer-facing provision and lifecycle do not.)

---

## D. Phase B — Routing / distribution v1

### Prior state

| Capability | Evidence | Status |
|------------|----------|--------|
| Queues + memberships | `WaInboxQueue`, `WaInboxQueueMembership` | Real |
| Manual claim/transfer/release | `assignThread` / `unassignThread` CAS | Real — must preserve |
| Pull next unassigned | `inboxQueueNext` + `/api/inbox/queue/next` | Real (operator pulls) |
| Auto round-robin on inbound | No service; comment in `threadAssignmentService`: “não inventar round-robin” | Missing |
| Config flag | `TenantOperationalConfig` has `aiEnabled` / `automationEnabled` only | Missing `automaticDistributionEnabled` |
| Docs | `OPERATIONAL_QUEUES_CANONICAL.md` §6 — “when it exists” | Gap acknowledged |

### Confirmed gap

Automatic distribution on new unassigned inbound is **not configured / not implemented**. Manual ownership and pull-next are strong; pilot needs push-style round-robin for 2 operators.

### Implementation decision

1. Add `automaticDistributionEnabled` (default `false`) on `TenantOperationalConfig` **or** queue-level flag if queue-scoped is cleaner — **prefer tenant-level for Client 1** (one clinic, one policy), optional queue override later.
2. New small service e.g. `automaticRoutingService`:
   - eligibility: same tenant, operational role, `status=active`, queue member when `queueId` set, skip disabled;
   - presence: **do not** require `available` for v1 (presence is soft/manual) — document decision;
   - strategy: round-robin with durable cursor (queue or tenant counter) updated under transaction;
   - call **`assignThread(..., callerRole: "system")`** — never write `assignedToUserId` directly;
   - skip if already assigned / CLOSED;
   - no eligible → leave unassigned + audit/log; **never fail inbound**.
3. Hook **after** successful `persistWaInboxFromWebhook` (side-effect), gated by config.
4. Audit metadata: `source: automatic_routing`, `strategy: round_robin`, `queueId`.
5. Concurrency: CAS on assignment + transactional cursor update; competing claims remain first-writer-wins.

### Readiness score

**4/10 → target 9/10**  
(Manual + pull-next exist; auto push + config + rotation state missing.)

---

## E. Phase C — Safe AI pilot

### Prior state

| Capability | Evidence | Status |
|------------|----------|--------|
| Auto-reply pipeline | `runTenantAiAutoReply` after webhook persist | Real |
| Guard | empty, off, PENDING/CLOSED, **human_assigned**, sensitive keywords, OOH | Real |
| Safe mode pilot | `aiPilotDecision` + env `WHATSAPP_AI_SAFE_MODE` | Real |
| Handoff | `needsHumanHandoffService` → PENDING + HIGH + tag | Real |
| Suggest reply (assisted) | `POST .../suggest-reply` | Real |
| `autoReply` toggle | schema default **true**; UI in `/settings/ai` | Real but not pilot-default-safe |
| FAQ CRUD | `/api/faq` | Real |
| FAQ → prompt/runtime | **no references in `modules/ai`** | Gap |
| Dental/clinical boundary | no structural clinical keywords beyond commercial/legal sensitive set | Gap for dental ICP |
| Inbound durability vs AI | AI in background after persist | Real — preserve |

### Confirmed gaps

1. **FAQ grounding** into reply generation (auto and suggest).
2. **Explicit pilot modes** as product contract: Assisted default vs Restricted auto (today: toggles exist but defaults/docs lean autonomous).
3. **Dental clinical handoff** structural triggers (diagnosis/medication/emergency triage).
4. Ensure assisted path is the **documented pilot default** without weakening human-assigned block.

### Implementation decision

1. Keep safe mode / guard / ownership block intact.
2. Wire FAQ retrieval (tenant-scoped keyword/simple match — no new vector DB) into:
   - suggest-reply context;
   - auto-reply only when FAQ-supported **and** Restricted auto mode.
3. Pilot modes:
   - **ASSISTED (default for Client 1):** `enabled=true`, `autoReply=false` → suggestions only;
   - **RESTRICTED_AUTO:** `autoReply=true` + FAQ-bounded answers + existing handoff for unsupported/clinical/low confidence.
4. Extend sensitive/clinical patterns conservatively in guard or pilot pre-LLM.
5. Failures: continue no-throw / no inbound loss.

### Readiness score

**6/10 → target 9/10**  
(Strong safe-mode foundation; FAQ + dental boundary + assisted-as-default still open.)

---

## F. Security / non-regression checklist

Must not regress:

- Tenant scoping on every mutation
- Ownership CAS / first-writer-wins
- `clientRequestId` send ledger
- Webhook HMAC + inbound persist-before-AI
- Fail-closed Stripe entitlements
- Audit on assignment transitions
- No password / activation secret in logs or API responses

---

## G. Migration risk

| Change | Risk | Notes |
|--------|------|-------|
| `User.status` (+ activation fields) | Low — additive; backfill existing → `active` | Requires human-approved migration apply in real envs |
| `TenantOperationalConfig.automaticDistributionEnabled` | Low — additive default false | Safe |
| Round-robin cursor table/field | Low — additive | Prefer queue or tenant counter row |
| Destructive drops/renames | **Out of scope** | Stop if proposed |

---

## H. Test plan (acceptance)

### Multi-agent

Manager creates operator; activate/auth; same tenant; appears in agents; claim + transfer; privilege/tenant injection negatives; duplicate email; cross-tenant list/assign blocked; disabled cannot operate.

### Routing

1/2/3 operators rotation; skip ineligible; no eligible → unassigned; flag off → no auto; CLOSED/owner preserved; concurrent claim; inbound persists if routing fails; audit source.

### AI

Assisted no-send; FAQ bounded; unsupported/clinical/low confidence → handoff; provider fail → inbound OK; human assigned blocks auto; FAQ tenant isolation; AI off → human inbox works.

### Integrated fixture

Tenant `Clínica Aurora` — Ana (manager), Bruno/Carla (operators) — queue + routing + FAQ safe + clinical handoff + cross-tenant negative.

---

## I. Stop conditions evaluated

| Condition | Result |
|-----------|--------|
| Architecture conflict | **No** |
| Auth replacement required | **No** |
| Routing requires weakening CAS | **No** — compose `assignThread` |
| Unsafe migration state | **No** for additive plan |
| Critical tenant isolation defect found in audit | **None newly confirmed** (existing tests remain gate) |
| Complete equivalent already exists | **No** — three gaps confirmed |
| Wrong branch for implementation | **Yes — stop before editing on ApplyFlow** |

---

## J. Commercial readiness (pre-implementation)

**NO-GO for self-serve multi-operator Client 1 today.**  
**GO WITH CONDITIONS** only if DevFlow manually provisions operators via script for a single-manager pilot — contradicts the sprint DoD (“no routine DB edit”).

After closing A+B+C under assisted pilot posture: expected verdict **GO WITH CONDITIONS** (staging smoke, Meta ownership, LGPD sign-off still required — outside this code sprint).

---

## K. Next action

1. Cut branch from `origin/main`: `feat/whatsapp-client1-commercial-readiness`.
2. Implement Phase A → targeted tests.
3. Phase B → concurrency tests.
4. Phase C → AI/FAQ/clinical tests.
5. Integrated Client 1 fixture + docs update + final readiness report.
6. **STOP BUILDING** → freeze → staging smoke → distribution.
