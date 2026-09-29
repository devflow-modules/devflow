# WhatsApp Platform — Engineering Case (evidence-bounded)

**Branch evidence:** `rem/whatsapp-platform-remediation-p0-p1`  
**Audience:** portfolio / Engineering Case (not CV rewrite)  
**Rule:** Only claims below that are CAREER_SAFE in `CLAIM_REGISTRY.md`.

## Narrative (verified)

Meta Cloud API webhooks are authenticated (HMAC), resolved to a tenant via unique `phone_number_id`, and persisted into a multi-tenant inbox (`wa_inbox_*`) with uniqueness on `(tenantId, waMessageId)`. HTTP ACK is returned after durable persistence; optional AI/automation runs via Next.js `after()` (best-effort, not a durable job queue).

Human outbound sends (inbox and admin) use a `WaInboxSendRequest` ledger keyed by `clientRequestId` with CAS before Graph `sendText`, so Meta acceptance + local persist failure does not invite blind resend. Graph retries are classified: 429/5xx may retry; permanent 4xx and ambiguous timeouts/network failures do not blind-resend.

Out-of-order delivery statuses are buffered in `WaInboxPendingStatus` until the message row exists. Stripe webhooks use a PROCESSING → PROCESSED | FAILED state machine so handler failures remain retryable. Paid entitlements require entitled subscription statuses (`active`/`trialing`); `past_due`/`canceled`/`unpaid` fail closed to FREE capabilities.

## Verified locally (Phase 2 + 3)

- Vitest `--project node`: 225 files, 1214 tests passed (13 PG tests skipped unless opt-in env)
- Vitest `--project ui`: 35 files, 166 tests passed
- Opt-in PostgreSQL 16 labs: `pnpm run test:pg-evidence` (see `PG_EVIDENCE_LABS.md`) — inbound idempotency c2–c20, thread upsert race, Stripe claim/retry, send ledger, targeted two-tenant negatives
- Migration `20260929190000`: fresh deploy + simulated pre-migration Stripe table upgrade with data preserved
- Phase 2 CI green on `3f2bb37d` (test-whatsapp, lint, build, architecture guard, a11y/tsc)

## Limitations (must stay visible)

- Assisted pilot posture (CURRENT-SCOPE): not unattended multi-tenant scale
- `after()` is not Redis/Bull durability
- PG labs are localhost/disposable only; not CI-default; no live Meta/Stripe production proof
- Tenant evidence = targeted service-layer matrix, not formal isolation proof
- P2 open: WA-OPS-001, WA-SEC-002, WA-AUTHZ-001, WA-DATA-001

## Differentiation

Distinct from ApplyFlow (career automation) and Prospecta (Places/CRM acquisition): this case is **webhook-driven multi-tenant messaging SaaS** with ledgered outbound and billing entitlement boundaries.
