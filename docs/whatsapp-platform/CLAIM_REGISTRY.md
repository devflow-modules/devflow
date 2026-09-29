# WhatsApp Platform — Claim Registry

**Status:** audit + Phase 2 remediation + Phase 3 evidence closure  
**Audit commit:** `6145f3fc589ad0034ad382b8f62f5dee205a56d0`  
**Remediation branch:** `rem/whatsapp-platform-remediation-p0-p1`  
**Canonical runtime:** `apps/whatsapp-platform`  
**Updated:** 2026-09-29 (Phase 3)  

Classification legend: `PUBLIC_REPRODUCIBLE` | `PUBLIC_DOCUMENTED` | `LOCAL_REPRODUCIBLE` | `LOCAL_LAB_ONLY` | `CI_VERIFIED` | `UNVERIFIED`

---

## Product & architecture

### CLAIM-01 — Dedicated multi-tenant WhatsApp Cloud API runtime

- **EVIDENCE:** `CURRENT-SCOPE.md`, `ARCHITECTURE.md`, app tree
- **CLASSIFICATION:** `PUBLIC_DOCUMENTED` + `LOCAL_REPRODUCIBLE`
- **LIMITATION:** Portal demo/marketing may be mock
- **CAREER_SAFE:** yes

### CLAIM-02 — Meta webhook HMAC + tenant-by-phone + durable inbox persist before ACK

- **EVIDENCE:** `webhookSignature.ts`; `webhookHandler.ts` (persist + health → ACK → `after()` AI); Vitest webhook suites (incl. deferred pipeline)
- **CLASSIFICATION:** `LOCAL_REPRODUCIBLE`
- **LIMITATION:** `after()` is **not** a durable queue; crash after ACK may skip AI until Meta retry (inbound already idempotent)
- **CAREER_SAFE:** yes (do not claim durable workers)

### CLAIM-03 — Human outbound ledger (inbox + admin)

- **EVIDENCE:** `outboundSendRequestService.ts`; inbox send route; admin send route now requires `clientRequestId` + same ledger; unit tests
- **CLASSIFICATION:** `LOCAL_REPRODUCIBLE`
- **LIMITATION:** Auto-reply path still Meta-first + claim table (different mechanism)
- **CAREER_SAFE:** yes (human paths)

### CLAIM-04 — Assignment CAS

- **EVIDENCE:** `threadAssignmentService.ts` + 16 Vitest cases passed locally (Phase 2)
- **CLASSIFICATION:** `LOCAL_REPRODUCIBLE`
- **LIMITATION:** App-level CAS, not DB exclusion on assignee
- **CAREER_SAFE:** yes

### CLAIM-05 — JWT + session revoke + roles

- **EVIDENCE:** `validateAuth.test.ts` passed
- **CLASSIFICATION:** `LOCAL_REPRODUCIBLE`
- **CAREER_SAFE:** yes

### CLAIM-06 — Tenant scoping pattern (targeted two-tenant negative tests)

- **EVIDENCE:** automation/search/handoff unit tests + Phase 3 `pgEvidence.realpostgres.test.ts` (A↔B read/assign/ledger/phone line; service layer)
- **CLASSIFICATION:** `LOCAL_REPRODUCIBLE` (narrow; PG labs opt-in)
- **LIMITATION:** Not full API matrix; platform_admin intentional cross-tenant admin routes out of scope
- **CAREER_SAFE:** yes if labeled “targeted two-tenant negative tests for canonical inbox/send paths”

### CLAIM-07 — Stripe webhook state machine + entitlement status gate

- **EVIDENCE:** `claimStripeWebhookEvent` PROCESSING→PROCESSED|FAILED; `ENTITLEMENT_STATUS_POLICY.md`; `getTenantPlan.entitlement.test.ts`; billingRepository claim tests
- **CLASSIFICATION:** `LOCAL_REPRODUCIBLE`
- **LIMITATION:** Real Stripe concurrency lab is **local PostgreSQL only** (no live Stripe); production billing readiness still pilot-scoped
- **EVIDENCE (Phase 3):** `pnpm run test:pg-evidence` — concurrent claim + fail→retry→PROCESSED on PG 16
- **CLASSIFICATION (Phase 3):** `LOCAL_REPRODUCIBLE` for state machine under concurrent PG writes; not `CI_VERIFIED`
- **CAREER_SAFE:** yes for “fail-closed past_due/canceled + retryable Stripe failures”; no for “production billing at scale”

### CLAIM-08 — OAuth/token logging scrubbed

- **EVIDENCE:** `safeOAuthBodySummary`; `embeddedSignupLogRedact.test.ts` (spy proves token absent from logs)
- **CLASSIFICATION:** `LOCAL_REPRODUCIBLE`
- **LIMITATION:** Adjacent Graph bodies must keep using safe summary (WABA fetch updated)
- **CAREER_SAFE:** yes

### CLAIM-09 — Unattended multi-tenant scale

- **CLASSIFICATION:** `UNVERIFIED` as positive; negative documented in CURRENT-SCOPE
- **CAREER_SAFE:** **no**

### CLAIM-10 — Exactly-once

- **CAREER_SAFE:** **no**

### CLAIM-11 — Out-of-order Meta status buffered

- **EVIDENCE:** `WaInboxPendingStatus` + `waInboxApplyStatus` upsert + `applyPendingStatusesForMessage`; unit test orphan buffer
- **CLASSIFICATION:** `LOCAL_REPRODUCIBLE`
- **LIMITATION:** Phase 3 PG lab did not re-run full status→message integration on real Postgres (unit coverage remains)
- **CAREER_SAFE:** yes

### CLAIM-12 — Meta retry classification (no blind timeout resend)

- **EVIDENCE:** `packages/whatsapp-core` `metaErrors.ts` + adapter; `metaRetryClassification.test.ts`; `META_RETRY_BOUNDARY.md`
- **CLASSIFICATION:** `LOCAL_REPRODUCIBLE`
- **CAREER_SAFE:** yes

### CLAIM-13 — Durable Redis/Bull workers

- **CAREER_SAFE:** **no**

---

## Security recheck (Phase 2)

| ID | Status |
|----|--------|
| WA-SEC-001 | **FIXED** |
| WA-BILL-001 | **FIXED** |
| WA-BILL-002 | **FIXED** (code + unit + PG concurrent claim lab) |
| Webhook ACK | **MITIGATED** (`after()`; durability limitation documented) |
| Orphan status | **FIXED** (pending table; unit) |
| Inbound P2002 | **FIXED** (converge null; unit) |
| Meta retry | **FIXED** |
| Admin ledger | **FIXED** |
| WA-OPS-001 / WA-SEC-002 / WA-AUTHZ-001 / WA-DATA-001 | **OPEN** (P2) |

---

## Local test evidence (Phase 2 + 3)

| Suite | Result |
|-------|--------|
| Focused remediation suites (signature, auth, ledger, entitlement, redact, stripe claim, meta retry, webhook idempotency, …) | **passed** |
| `vitest run --project node` | **225 files / 1214 passed**, **13 skipped** (PG labs unless `WHATSAPP_PG_INTEGRATION=1`) |
| `vitest run --project ui` | **35 files / 166 passed** |
| `pnpm run test:pg-evidence` (PG 16 Docker localhost:5435) | **13 passed** — inbound c2/c5/c10/c20, thread race, Stripe claim/retry, send ledger, tenant matrix |
| Migration `20260929190000` | **fresh deploy OK**; **upgrade sim OK** (legacy `stripe_webhook_events` row preserved, status backfill `PROCESSED`) |
| CI on remediation branch | **CI_VERIFIED** on commit `3f2bb37d` (Phase 2); re-run required after Phase 3 push |

### CLAIM-02 supplement — DB inbound idempotency under PG concurrency

- **EVIDENCE:** `pgEvidence.realpostgres.test.ts` + `PG_EVIDENCE_LABS.md`
- **CLASSIFICATION:** `LOCAL_REPRODUCIBLE` (not default CI)
- **LIMITATION:** Lab DB only; does not prove production load
- **CAREER_SAFE:** yes (idempotent/convergent wording)

---

## Differentiation

- vs ApplyFlow: Meta webhook reliability, messaging ledger, multi-agent inbox SaaS — not job-automation/extension
- vs Prospecta: operational channel SaaS + Stripe entitlement — not Places lead acquisition

**Registry verdict:** Remediation raises evidence quality; career distribution still separate phase.
