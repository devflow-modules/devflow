# Real Provider Runtime Readiness Checklist

This checklist must be completed before Career Suite introduces any real OAuth, Nango runtime, Gmail connector, Calendar connector, provider token handling, or provider sync job.

---

## Current status

**Implemented:**

- provider consent architecture
- provider adapter contracts
- Nango sandbox adapter using fake payloads
- provider connection status model
- ApplyFlow consent mock panel
- provider runtime feature flag plan
- feature flag evaluation helpers
- disabled provider runtime shell
- consent-gated provider connection action mock
- ApplyFlow consent panel action simulation
- provider runtime app boundary contract
- provider runtime environment and secrets boundary
- first real Nango OAuth boundary behind explicit flags and consent
- ApplyFlow Nango connect session server boundary
- ApplyFlow Nango connect session launcher route
- ApplyFlow explicit provider consent UI
- Nango Connect UI integration behind flags and explicit consent
- Provider connection status from Nango runtime boundary
- Server-side Nango connection verification boundary
- Gmail read-only adapter contract — `@devflow/career-sync` `gmail-readonly-adapter`
- Gmail read-only sandbox adapter — `@devflow/career-sync` `createGmailReadOnlySandboxAdapter`
- Gmail read-only Nango runtime adapter — ApplyFlow `executeApplyFlowGmailReadOnlyRuntimeBoundary`
- Calendar read-only adapter contract — `@devflow/career-sync` `calendar-readonly-adapter`
- Calendar read-only sandbox adapter — `@devflow/career-sync` `createCalendarReadOnlySandboxAdapter`
- Calendar read-only Nango runtime adapter — ApplyFlow `executeApplyFlowCalendarReadOnlyRuntimeBoundary`
- Provider-derived runtime composition — ApplyFlow `executeApplyFlowProviderDerivedRuntimeBoundary`
- Provider-derived runtime preview — ApplyFlow `POST /provider-runtime/nango/derived-preview` (opt-in, ephemeral; server verifies Gmail + Calendar via Nango before runtimes; client connection state is UX-only)
- Provider-derived runtime review — ApplyFlow `ProviderDerivedRuntimeReviewPanel` (in-memory selection/dismiss of preview signals; no persistence, no CareerBundle mutation, no provider calls)
- Provider-derived enrichment proposal — ApplyFlow `buildProviderDerivedEnrichmentProposal` (ephemeral proposal from selected signals; no persistence, no CareerBundle mutation)
- Provider-derived enrichment proposal export — ApplyFlow browser-side JSON download of ready proposals (no upload, no persistence)
- Provider-derived enrichment proposal export validation — `@devflow/career-sync` standalone v1 document validator (no import, no persistence)
- Provider-derived enrichment proposal export lifecycle and trust model — documented export-only artifact boundaries ([PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md), [ADR-002](../../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md))
- Provider-derived career insights (read-only) — ApplyFlow `ProviderDerivedCareerInsightsPanel` (session metrics only, no persistence)
- Provider-derived enrichment change preview — ApplyFlow `ProviderDerivedEnrichmentChangePreviewPanel` (read-only diff, no apply)
- Current CareerBundle enrichment wiring — optional dashboard baseline via `deriveDashboardCareerBundleSyncEnrichmentBaseline` + `extractCareerBundleSyncEnrichment` (no import, no apply, no bundle mutation)
- Provider-derived enrichment export composition — transient provider-derived enrichment in dashboard export preview via `deriveDashboardCareerBundleExportComposition` (no auto-export, no persistence)
- Provider-derived sandbox composition — `@devflow/career-sync` `composeProviderDerivedSignals`
- Provider-derived enrichment adapter — `@devflow/career-sync` `adaptProviderDerivedSignalsToSyncEnrichment`

**Not implemented:**

- real OAuth
- Nango SDK runtime
- Gmail API connector
- Calendar API connector
- provider token storage
- provider sync jobs
- persisted provider connection state
- real provider data import

---

## Provider runtime app boundary contract

Before real OAuth is introduced, Career Suite defines an app boundary contract for future provider runtime actions.

The boundary returns client-safe results and does not expose tokens, raw provider payloads, provider calls, or persistence behavior.

Public exports: `createProviderRuntimeAppBoundaryResult`, `isProviderRuntimeAppBoundaryResultSafeForClient`.

---

## Environment and secrets boundary

Before real OAuth is introduced, Career Suite must define where runtime flags and secrets may live.

Secrets must remain server/runtime-only and must not reach client components, CareerBundle exports, Interview Lab imports, logs, fixtures, or demo JSON.

See [`PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md`](./PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md).

---

## First OAuth boundary status

The first OAuth boundary validates the gate and consent model for future Nango runtime.

It is not a Gmail or Calendar data integration.

Public exports: `evaluateNangoOAuthBoundary`, `createNangoOAuthBoundaryResult`.

---

## Required feature flags

All real runtime behavior must require:

- `CAREER_PROVIDER_RUNTIME_ENABLED=true`
- `NANGO_RUNTIME_ENABLED=true`
- provider-specific flag:
  - `GMAIL_PROVIDER_ENABLED=true`
  - `CALENDAR_PROVIDER_ENABLED=true`

Missing flags must behave as disabled.

Provider-specific flags must never bypass the global provider runtime flag.

See [`PROVIDER-RUNTIME-FEATURE-FLAGS.md`](./PROVIDER-RUNTIME-FEATURE-FLAGS.md).

---

## Required consent gates

Before OAuth starts, the UI must show:

- provider name
- runtime name
- requested scopes
- what data may be accessed
- what data is never stored
- revoke/disconnect option
- delete derived data option
- user review requirement
- explicit consent confirmation

Feature flags are not consent.

See [`PROVIDER-CONSENT-ARCHITECTURE.md`](./PROVIDER-CONSENT-ARCHITECTURE.md).

---

## Token boundary requirements

Tokens must never be exposed to:

- client components
- browser localStorage
- sessionStorage
- cookies controlled by app code
- CareerBundle
- sync enrichment payloads
- ApplyFlow exports
- Interview Lab imports
- logs
- fixtures
- demo JSON

Any token handling must stay inside an approved runtime/vault boundary.

---

## Provider data boundary requirements

The runtime must not persist:

- raw email body
- full email snippet
- raw calendar description
- meeting links
- attendee emails
- attachments
- headers
- provider message IDs
- provider event IDs
- provider payloads
- OAuth tokens
- refresh tokens

Only derived, redacted signals may leave the adapter layer.

See [`SYNC-DATA-BOUNDARIES.md`](./SYNC-DATA-BOUNDARIES.md).

---

## OAuth readiness checklist

Before a real OAuth PR is allowed:

- [ ] feature flag helpers are used
- [ ] missing flags fail closed
- [ ] global flag gates all provider runtime
- [ ] provider-specific flags cannot bypass global/Nango gates
- [ ] consent must be explicit
- [ ] OAuth cannot start without consent
- [ ] OAuth cannot start with flags disabled
- [ ] no token reaches client code
- [ ] no token reaches CareerBundle
- [ ] no token reaches localStorage/sessionStorage
- [ ] no raw provider payload is persisted
- [ ] no raw provider payload reaches apps
- [ ] revoke/disconnect path is designed
- [ ] delete derived data path is designed
- [ ] sandbox flows still work with runtime flags disabled
- [ ] tests prove disabled-by-default behavior

---

## First real runtime PR scope

The first real runtime PR must be minimal.

**Allowed:**

- add Nango runtime dependency only if required
- add disabled-by-default runtime boundary
- add OAuth initiation only behind flags + explicit consent
- return safe connection status
- test blocked paths heavily

**Not allowed:**

- background sync
- Gmail data import
- Calendar data import
- raw provider payload storage
- automatic enrichment
- CareerBundle provider token fields
- token exposure to client
- auto-submit
- auto-send

---

## Required tests for first OAuth PR

The first OAuth PR must test:

- flags missing blocks OAuth
- global flag false blocks OAuth
- Nango flag false blocks OAuth
- provider flag false blocks OAuth
- missing consent blocks OAuth
- explicit consent + all flags is required
- no token appears in serialized client payloads
- no token appears in CareerBundle
- no raw provider payload appears in app-level result
- sandbox adapter remains available with flags disabled

---

## Production safety requirement

A real runtime PR must not make provider runtime active by default in development, preview, or production.

Activation must be explicit and auditable.

---

## Correct public claim

**Correct:**

Career Suite has a consent-gated provider runtime architecture, sandbox adapters, mock UI, feature flag gates, and readiness criteria for future real provider integration.

**Avoid:**

- Gmail is connected
- Calendar is connected
- Nango sync is live
- OAuth is active
- provider data is imported automatically

---

## Related

- [Integrations overview](./README.md)
- [Provider Consent Integration Architecture](./PROVIDER-CONSENT-ARCHITECTURE.md)
- [Provider Runtime Feature Flags](./PROVIDER-RUNTIME-FEATURE-FLAGS.md)
- [Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)
- [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)
- [Provider-Derived Enrichment Proposal Export Lifecycle](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md)
- [ADR-002: export-only](../../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md)
- [E2E sync enrichment checklist](../demo/E2E-SYNC-ENRICHMENT-CHECKLIST.md)
