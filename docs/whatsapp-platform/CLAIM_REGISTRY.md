# WhatsApp Platform — Claim Registry

**Status:** audit + Phase 2 remediation  
**Audit commit:** `6145f3fc589ad0034ad382b8f62f5dee205a56d0`  
**Remediation branch:** `rem/whatsapp-platform-remediation-p0-p1`  
**Canonical runtime:** `apps/whatsapp-platform`  
**Updated:** 2026-09-29  

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

### CLAIM-06 — Tenant scoping pattern (partial negative tests)

- **EVIDENCE:** existing cross-tenant tests (automation, search, handoff); not a full matrix
- **CLASSIFICATION:** `LOCAL_REPRODUCIBLE` (narrow)
- **LIMITATION:** Do not claim complete isolation proof
- **CAREER_SAFE:** yes if narrow

### CLAIM-07 — Stripe webhook state machine + entitlement status gate

- **EVIDENCE:** `claimStripeWebhookEvent` PROCESSING→PROCESSED|FAILED; `ENTITLEMENT_STATUS_POLICY.md`; `getTenantPlan.entitlement.test.ts`; billingRepository claim tests
- **CLASSIFICATION:** `LOCAL_REPRODUCIBLE`
- **LIMITATION:** Real Stripe/Postgres concurrency labs = `LOCAL_LAB_ONLY` / `NOT_VERIFIED` this phase; production billing readiness still pilot-scoped
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
- **LIMITATION:** Full status→message integration on real Postgres = `LOCAL_LAB_ONLY` this phase
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
| WA-BILL-002 | **FIXED** (code + unit); real concurrent Stripe lab **NOT_VERIFIED** |
| Webhook ACK | **MITIGATED** (`after()`; durability limitation documented) |
| Orphan status | **FIXED** (pending table; unit) |
| Inbound P2002 | **FIXED** (converge null; unit) |
| Meta retry | **FIXED** |
| Admin ledger | **FIXED** |
| WA-OPS-001 / WA-SEC-002 / WA-AUTHZ-001 / WA-DATA-001 | **OPEN** (P2) |

---

## Local test evidence (Phase 2)

| Suite | Result |
|-------|--------|
| Focused remediation suites (signature, auth, ledger, entitlement, redact, stripe claim, meta retry, webhook idempotency, …) | **passed** |
| `vitest run --project node` | **225 files / 1214 tests passed** (LOCAL_REPRODUCIBLE) |
| `vitest run --project ui` | pending / see remediation report |
| Real PostgreSQL concurrency labs | **NOT_VERIFIED** (no dedicated test DB wired this session) |
| CI on remediation branch | see report (`CI_VERIFIED` only after Actions URL) |

---

## Differentiation

- vs ApplyFlow: Meta webhook reliability, messaging ledger, multi-agent inbox SaaS — not job-automation/extension
- vs Prospecta: operational channel SaaS + Stripe entitlement — not Places lead acquisition

**Registry verdict:** Remediation raises evidence quality; career distribution still separate phase.
