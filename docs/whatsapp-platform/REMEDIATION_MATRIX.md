# WhatsApp Platform — Remediation Matrix (Phase 2)

**Branch:** `rem/whatsapp-platform-remediation-p0-p1`  
**Start commit:** `6145f3fc589ad0034ad382b8f62f5dee205a56d0`

| ID | Current behavior | Desired invariant | Affected code | Existing tests | Required tests | Status |
|----|------------------|-------------------|---------------|----------------|----------------|--------|
| WA-SEC-001 | OAuth token body logged via `bodyPreview` | No credential/raw OAuth body in logs | `embeddedSignupOAuthExchange.ts`, `embeddedSignupWabaFetch.ts`, redact helpers | sanitize / token-origin tests | Log-spy regression | **DONE** |
| WA-BILL-001 | `BillingSubscription.plan` used regardless of status | Non-entitled Stripe statuses → FREE capabilities | `subscriptionService.ts` + policy module | stripeSync status maps | Table-driven status suite | **DONE** |
| Webhook ACK | ACK after AI/automation loop | ACK after durable accept; slow work deferred via `after()` (not durable queue) | `webhookHandler.ts` | webhookHandler* | ACK-before-slow-work unit | **DONE** |
| WA-BILL-002 | Stripe event row = permanently processed | FAILED remains retryable; PROCESSED only after success | `billingRepository`, stripe webhook route, schema | idempotency test | failure→retry→success | **DONE** (unit) |
| Orphan status | Status before message dropped | Pending status retained + applied on inbound | `waInboxMessageService`, new pending model | applyStatus paths | status→message lab | **DONE** (unit; PG lab NOT_VERIFIED) |
| Inbound P2002 | Race may surface error | Converge on unique; idempotent null/existing | `waInboxCreateInbound` | idempotency sequential | concurrent create | **DONE** (unit) |
| Meta retry | Retries all errors | Classify permanent vs transient; timeouts ambiguous (no blind resend) | `packages/whatsapp-core` retry/adapter | none focused | classification unit | **DONE** |
| Admin send ledger | No `clientRequestId` ledger | Same ledger semantics as inbox send | admin send route + UI | outboundSendRequestService | admin replay | **DONE** |

**Entitlement policy (explicit):** Align `BillingSubscription` with `TenantSubscription`: only `active` / `trialing` (and TenantSubscription `ACTIVE` / `TRIAL`) grant paid plan capabilities. `past_due`, `canceled`, `unpaid`, `incomplete`, `incomplete_expired`, `paused`, unknown → treat as non-entitled (effective FREE via fallthrough to `Tenant.plan` only when no entitled subscription row applies; if only a non-entitled paid row exists, return FREE). Documented in `ENTITLEMENT_STATUS_POLICY.md`.

**Webhook ACK limitation:** `next/server` `after()` is best-effort for the process lifetime — **not** a durable job queue. Crash after ACK may skip AI auto-reply until Meta retry (inbound already persisted → idempotent).
