# Provider Consent Integration Architecture

## Purpose

This document defines the future architecture for consent-based provider integrations in Career Suite.

The goal is to connect external providers only after explicit user consent, convert provider data into derived career signals, and prevent raw provider payloads from leaking into CareerBundle, ApplyFlow, or Interview Lab.

Current implementation status:

```txt
Implemented:
- demo/sandbox sync enrichment
- CareerBundle sync enrichment contract
- career-core privacy validation
- ApplyFlow opt-in demo export
- Interview Lab read-only import preview

Not implemented yet:
- OAuth runtime
- Nango SDK runtime
- Gmail API connector
- Calendar API connector
- provider token storage
- provider sync jobs
```

**This document is planning only.** No OAuth, Nango SDK, Gmail API, or Calendar API runtime exists in Career Suite apps today.

---

## Architecture overview

```txt
Provider OAuth / Nango
        ↓
Provider Consent Layer
        ↓
Provider Adapter Layer
        ↓
@devflow/career-sync
        ↓
CareerSyncSignal[]
        ↓
CareerBundleUnifiedSyncEnrichment
        ↓
@devflow/career-core privacy validation
        ↓
CareerBundle export/import
        ↓
ApplyFlow / Interview Lab opt-in surfaces
```

Nango is a **provider adapter layer**, not a core dependency of CareerBundle, `@devflow/career-core`, ApplyFlow, or Interview Lab.

---

## Core principles

| Principle | Meaning |
|-----------|---------|
| **Explicit consent** | User must actively connect each provider; no silent or implied access |
| **Revocable access** | Disconnect/revoke must stop new fetches and allow deletion of derived data |
| **Least-data** | Collect only what is needed to derive career workflow signals |
| **Derived signals only** | CareerBundle carries `CareerSyncSignal` metadata, not provider payloads |
| **Raw payload discard** | Provider responses are mapped and discarded in the adapter layer |
| **User review before use** | Sync preview and enrichment review before export or merge |
| **Provider isolation** | Apps never import provider SDKs or call Gmail/Calendar APIs directly |
| **No auto-submit** | Sync must not apply to jobs or mutate application state automatically |
| **No auto-send** | Sync must not send email or create calendar events without explicit user action |
| **No hidden sync** | Connection status, last sync, and scopes must be visible to the user |
| **No AI-required decisioning** | LLM layers remain opt-in; deterministic core stays authoritative |

---

## Consent model

Future provider integration **must** include:

| Control | Description |
|---------|-------------|
| Connect provider button | Explicit action per provider (Gmail, Calendar) |
| Clear explanation of what is accessed | Scopes and derived signal types in plain language |
| Clear explanation of what is never stored | Raw bodies, tokens, meeting links, attachments |
| Provider scopes displayed before consent | User sees OAuth scope list before approving |
| Sync preview before enrichment is used | User reviews derived signals before export/merge |
| Disconnect/revoke control | Stops new sync; documents what happens to derived data |
| Delete derived sync data control | Per-provider or bulk purge without deleting manual ApplyFlow rows |
| Audit timestamp | `connectedAt`, `lastSyncAt`, `revokedAt` as applicable |
| Provider name | e.g. `gmail`, `google_calendar` |
| Connection status | `disconnected` \| `connected` \| `paused` \| `revoked` \| `error` |
| Last sync timestamp | When derived signals were last refreshed |

Future provider integration **must not** include:

- Silent sync or background sync without prior consent
- Provider access hidden behind a generic "import" or "enhance" action
- Sync enrichment persisted in Interview Lab or ApplyFlow without explicit opt-in
- Auto-merge of derived signals into application rows without user review

---

## Provider scope policy

> **Future design only.** Scopes below are intended minimal access — not implemented in production.

### Gmail-like providers

**Allowed derived concepts** (after adapter normalization):

```txt
recruiter screening signal
technical interview signal
offer signal
rejection signal
follow-up required
company hint
process stage
confidence
timestamp
```

**Forbidden data in CareerBundle:**

```txt
raw email body
full snippet
email addresses unless explicitly normalized/redacted
thread ID
message ID
attachments
headers
provider payload
OAuth token
refresh token
tracking pixels
URLs
```

### Calendar-like providers

**Allowed derived concepts:**

```txt
upcoming interview signal
technical interview signal
recruiter call signal
company hint
process stage
event time
confidence
```

**Forbidden data in CareerBundle:**

```txt
raw calendar description
meeting link
hangoutLink
Zoom/Teams/Meet URLs
attendee emails
provider event ID
conference data
location if it contains sensitive info
OAuth token
refresh token
provider payload
```

See also: [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md).

---

## Data flow

```txt
1. User explicitly connects provider.
2. Provider adapter receives provider data.
3. Adapter immediately maps raw payload to normalized provider-like input.
4. career-sync extracts CareerSyncSignal.
5. Raw payload is discarded.
6. Derived signals are redacted.
7. CareerBundleUnifiedSyncEnrichment is built.
8. career-core validates privacy flags.
9. User reviews enrichment before export/import usage.
10. Apps display aggregated metadata only.
```

At no step may raw provider payloads, OAuth tokens, or meeting links enter ApplyFlow, Interview Lab, or exported CareerBundle JSON.

---

## Storage policy

### Default (recommended)

| Data | Policy |
|------|--------|
| Raw provider payloads | **Never persisted** |
| OAuth tokens | **Not in client apps** — Nango vault or equivalent only |
| Sync enrichment in Interview Lab | **Not persisted** (current behaviour) |
| Derived sync signals | Local-only or backend-backed **only after explicit opt-in** |

### If backend storage is introduced (future)

- Store provider connection metadata separately from CareerBundle
- Store tokens only through provider integration vault (e.g. Nango)
- Store derived signals only — never raw payloads
- Support delete/revoke and audit `lastSyncAt`
- User can purge derived data without deleting manual ApplyFlow rows

---

## Package responsibilities

### `@devflow/career-sync`

```txt
normalizes provider-like inputs
extracts CareerSyncSignal
redacts sensitive data
builds Gmail/Calendar previews
builds CareerBundleUnifiedSyncEnrichment
does not own UI
does not own OAuth
does not persist raw payloads
```

### `@devflow/career-core`

```txt
validates sync enrichment privacy flags
attaches enrichment to CareerBundle
parses/serializes CareerBundle with optional sync enrichment
rejects unsafe enrichment
does not call provider APIs
does not parse raw provider payloads
```

### ApplyFlow

```txt
exports CareerBundle
may offer explicit opt-in enrichment surfaces
must keep default export without syncEnrichment
must explain demo vs real provider connection
must not hide provider sync
```

Current state: demo/sandbox opt-in export only (PR #57). Real provider connection UI is **not implemented**.

### Interview Lab

```txt
imports CareerBundle
shows read-only aggregated sync preview
does not persist sync enrichment by default
does not connect providers directly in current flow
does not show raw provider data
```

### Provider adapter layer (future)

```txt
owns provider-specific mapping
may depend on Nango/OAuth in the future
must not leak raw payloads into apps
must output provider-like normalized inputs or CareerSyncSignal
```

Apps **must not** import Nango SDK, Gmail API client, or Calendar API client directly.

---

## Provider adapter contracts

`@devflow/career-sync` defines provider adapter contracts before any real provider runtime is added.

The contracts define:

- provider connection metadata
- explicit consent metadata
- sync request shape
- normalized message/event shapes
- adapter result shape
- safety policy flags

These contracts do not implement OAuth, Nango runtime, Gmail API, Calendar API, or provider calls.

Public exports: `ProviderAdapter`, `ProviderSyncRequest`, `ProviderNormalizedMessage`, `ProviderNormalizedEvent`, `ProviderAdapterResult`, `ProviderAdapterSafetyPolicy`, and safety helpers (`createProviderAdapterSafetyPolicy`, `assertProviderAdapterResultSafe`, etc.).

## Nango sandbox adapter

`@devflow/career-sync` includes a Nango sandbox adapter that implements the provider adapter contracts without adding the Nango SDK or OAuth runtime.

The sandbox adapter accepts fake Nango-like payloads and maps them into safe `ProviderNormalizedMessage` and `ProviderNormalizedEvent` objects.

It is intended to validate adapter boundaries before a real provider runtime exists.

Public exports: `createNangoSandboxAdapter`, `mapNangoSandboxPayloadToProviderNormalized`, `NangoSandboxPayload`, `createNangoSandboxSyncRequest`.

## Consent UI mock

The ApplyFlow consent mock panel is a read-only product surface for demonstrating future provider consent boundaries.

It does not connect to providers, does not request OAuth, does not store tokens, and does not fetch Gmail or Calendar data.

Location: ApplyFlow dashboard — `ProviderConsentMockPanel` near the Interview Lab export card.

## Consent mock connection model

The ApplyFlow mock panel consumes fake/sandbox `ProviderConnectionSnapshot` data from `@devflow/career-sync`.

This demonstrates how future provider connection states can be displayed without connecting to providers or storing tokens.

Data source: `providerConsentMockConnections` in `apps/applyflow/src/components/dashboard/provider-consent-mock-data.ts`.

## Provider connection status model

`@devflow/career-sync` defines provider connection status models for future consent-based integrations.

The model can represent not connected, connected, expired, revoked, error, sync available, and sync disabled states without implementing OAuth, Nango runtime, provider calls, token storage, or persistence.

Public exports: `ProviderConnectionSnapshot`, `createProviderConnectionSnapshot`, `isProviderConnected`, `canProviderSync`, `summarizeProviderConnections`, `collectProviderConnectionWarnings`.

---

## Provider connection action mock

The provider connection action mock models the future connect/revoke/delete-derived-data actions without activating provider runtime.

It is consent-gated and runtime-gated, but remains read-only and disabled by design.

Public exports: `createProviderConnectionActionMock`, `createProviderConnectionActionSnapshot`.

---

## ApplyFlow consent action simulation

ApplyFlow uses the provider connection action mock to simulate future consent actions in a controlled, read-only UI.

This is not a real provider connection flow. It is a local simulation of the runtime gate and consent boundary.

Location: ApplyFlow dashboard — `ProviderConsentMockPanel` preview action buttons.

---

## Provider runtime feature flags

Real provider runtime must be gated by feature flags before any OAuth, Nango runtime, Gmail connector, or Calendar connector is introduced.

All runtime flags default to `false`. Missing flags are treated as disabled.

See [`PROVIDER-RUNTIME-FEATURE-FLAGS.md`](./PROVIDER-RUNTIME-FEATURE-FLAGS.md).

---

## Safety gates before implementation

## Implementation readiness checklist

Before adding OAuth/Nango runtime:

- [ ] provider scopes documented
- [ ] consent copy reviewed
- [ ] disconnect/revoke path designed
- [ ] delete derived data path designed
- [ ] raw payload discard policy documented
- [ ] token storage boundary documented
- [x] provider adapter interface designed
- [ ] sync preview reviewed before use
- [ ] no app imports provider SDK directly
- [ ] tests cover raw payload exclusion
- [ ] tests cover meeting link exclusion
- [ ] tests cover unsafe enrichment rejection
- [ ] docs distinguish demo/sandbox vs real provider

Cross-reference: [E2E sync enrichment checklist](../demo/E2E-SYNC-ENRICHMENT-CHECKLIST.md) for the implemented sandbox loop.

---

## Future PR sequence

Safe implementation order:

| PR | Title (suggested) | Scope |
|----|-------------------|--------|
| **A** | `docs: add provider consent integration architecture` | **This document** — planning only |
| **B** | `chore: add provider adapter interface contracts` | TypeScript interfaces in `@devflow/career-sync` or adapter package — no OAuth |
| **C** | `feat: add Nango provider adapter sandbox` | Fixture-based adapter mapping — no live OAuth |
| **D** | `feat: add consent UI mock/read-only state` | UI shells with mock connection state — no real tokens |
| **E** | `feat: add provider connection status model` | Connection metadata schema — no provider calls |
| **F** | `feat: add real Nango OAuth behind feature flag` | Live OAuth only after A–E gates pass |

**PR A through PR E and the feature flag plan are complete.** No runtime OAuth, Nango SDK, or live Gmail/Calendar connector ships until flag helpers, disabled runtime shell, and consent gates pass.

---

## Related

- [Integrations overview](./README.md)
- [Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)
- [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)
- [E2E sync enrichment checklist](../demo/E2E-SYNC-ENRICHMENT-CHECKLIST.md)
- [Roadmap execution](../ROADMAP-EXECUTION.md)
