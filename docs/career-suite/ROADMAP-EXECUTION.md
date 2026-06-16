# Career Suite Roadmap Execution

Versioned execution plan for the next Career Suite phase: **deterministic agent-ready core first**, optional AI adapters later, external integrations only after contracts are stable.

**Related:** [`AGENT-CONTRACTS.md`](./AGENT-CONTRACTS.md) · [`AGENT-ARCHITECTURE.md`](./AGENT-ARCHITECTURE.md) · [`README.md`](./README.md) · [Public case](../public-cases/CAREER-SUITE.md)

---

## Status atual

| Item | State |
|------|--------|
| Public Career Suite case | Merged (`docs/public-cases/CAREER-SUITE.md`) |
| ApplyFlow → CareerBundle → Interview Lab | Documented and demo-ready |
| Resume Match (`/career/ats`) | Deterministic heuristics + optional OpenAI coaching (opt-in) |
| CI / design governance | Strengthened (button primitives, design-system baseline, routing notes) |
| **`packages/career-agents`** | Deterministic core merged (job/resume/ATS) |
| **`packages/career-sync`** | Gmail/Calendar read-only prototypes + unified CareerBundle sync enrichment |
| **`packages/career-core` sync adapter** | Optional attach/validate for `CareerBundleUnifiedSyncEnrichment` |
| **`packages/career-core` export support** | Optional export/import helpers for validated sync enrichment |
| **Interview Lab sync preview** | Read-only import preview for validated sync enrichment |
| **ApplyFlow opt-in demo export** | Dashboard checkbox for sandbox sync enrichment in CareerBundle export |
| **Provider consent architecture** | Documented — [`integrations/PROVIDER-CONSENT-ARCHITECTURE.md`](./integrations/PROVIDER-CONSENT-ARCHITECTURE.md) |
| **Provider adapter interface contracts** | `@devflow/career-sync` types + safety helpers — no OAuth runtime |
| **Nango adapter sandbox** | Fake payloads via `ProviderAdapter` contracts — no Nango SDK |
| **ApplyFlow provider consent mock panel** | Read-only UI preview — no OAuth or provider calls |
| **Provider connection status model** | `@devflow/career-sync` snapshots + capabilities — no persistence |
| **ApplyFlow consent mock ↔ connection model** | Panel renders `ProviderConnectionSnapshot` fake data — read-only |
| **Provider runtime feature flag plan** | Documented — [`integrations/PROVIDER-RUNTIME-FEATURE-FLAGS.md`](./integrations/PROVIDER-RUNTIME-FEATURE-FLAGS.md) |
| **Provider runtime flag evaluation helpers** | `@devflow/career-sync` `provider-runtime-flags` — no runtime activation |
| **Disabled provider runtime shell** | `@devflow/career-sync` `provider-runtime` — gates + consent only, always disabled |
| **Consent-gated provider connection action mock** | `@devflow/career-sync` `provider-connection-action` — mock snapshots only |
| **ApplyFlow consent panel action simulation** | Dashboard previews connect/revoke/delete via action mock — read-only |
| **Real provider runtime readiness checklist** | Documented — [`integrations/REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md`](./integrations/REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md) |
| **Provider runtime app boundary contract** | `@devflow/career-sync` `provider-runtime-app-boundary` — client-safe mock boundary |
| **Provider runtime environment and secrets boundary** | Documented — [`integrations/PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md`](./integrations/PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md) |
| **First real Nango OAuth boundary** | `@devflow/career-sync` `nango-runtime` — flags + consent, no data import |
| **ApplyFlow Nango connect session server boundary** | `apps/applyflow` `provider-runtime` — `@nangohq/node` server-only |
| LibreChat / Nango / OpenClaw | **Not** MVP dependencies — accelerators after core |

**Next step:** Real provider integration only behind explicit consent; LibreChat/MCP lab over deterministic signals.

### ApplyFlow opt-in sync enrichment export

ApplyFlow can export a CareerBundle with optional **demo/sandbox** sync enrichment when explicitly enabled by the user on the dashboard export card. This does not connect to Gmail or Google Calendar, does not use Nango runtime, does not fetch provider data, and does not include raw provider payloads or meeting links.

### Completed — End-to-end sync enrichment loop

- ApplyFlow opt-in demo sync enrichment export
- CareerBundle export/import with optional sync enrichment
- career-core privacy validation
- Interview Lab read-only import preview
- Demo fixture and walkthrough
- Demo readiness checklist
- End-to-end technical validation checklist

### Completed — sync enrichment stack (documented in public case)

| Milestone | State |
|-----------|--------|
| Career sync foundation (`@devflow/career-sync`) | Done — fixtures/sandbox, no OAuth runtime |
| Gmail read-only sync preview | Done |
| Calendar read-only sync preview | Done |
| CareerBundle unified sync enrichment contract | Done |
| `@devflow/career-core` adapter | Done |
| CareerBundle export/import support | Done |
| Interview Lab read-only import preview | Done — not persisted |
| ApplyFlow opt-in demo export | Done — PR #57 |
| End-to-end validation checklist | Done — [`demo/E2E-SYNC-ENRICHMENT-CHECKLIST.md`](./demo/E2E-SYNC-ENRICHMENT-CHECKLIST.md) |

### Completed / In progress — provider integration foundation

- Provider consent integration architecture — [`integrations/PROVIDER-CONSENT-ARCHITECTURE.md`](./integrations/PROVIDER-CONSENT-ARCHITECTURE.md)
- Provider adapter interface contracts — `@devflow/career-sync` `provider-adapter` module
- Nango adapter sandbox using provider contracts — `@devflow/career-sync` `nango-adapter` module
- ApplyFlow provider consent mock panel — read-only consent preview on dashboard
- Provider connection status model — `@devflow/career-sync` `provider-connection` module
- ApplyFlow consent mock wired to provider connection model — dashboard snapshots from `@devflow/career-sync`
- Provider runtime feature flag plan — [`integrations/PROVIDER-RUNTIME-FEATURE-FLAGS.md`](./integrations/PROVIDER-RUNTIME-FEATURE-FLAGS.md)
- Provider runtime feature flag evaluation helpers — `@devflow/career-sync` `provider-runtime-flags` module
- Disabled provider runtime shell — `@devflow/career-sync` `provider-runtime` module
- Consent-gated provider connection action mock — `@devflow/career-sync` `provider-connection-action` module
- ApplyFlow consent panel action simulation — dashboard preview actions via action mock
- Real provider runtime readiness checklist — [`integrations/REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md`](./integrations/REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md)
- Provider runtime app boundary contract — `@devflow/career-sync` `provider-runtime-app-boundary` module
- Provider runtime environment and secrets boundary — [`integrations/PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md`](./integrations/PROVIDER-RUNTIME-ENV-SECRETS-BOUNDARY.md)
- First real Nango OAuth boundary behind explicit flags and consent — `@devflow/career-sync` `nango-runtime` module
- ApplyFlow Nango connect session server boundary — `apps/applyflow/src/lib/provider-runtime/`
- ApplyFlow Nango connect session launcher route — `apps/applyflow/src/app/provider-runtime/nango/connect/route.ts`
- ApplyFlow explicit provider consent UI — `apps/applyflow/src/components/dashboard/provider-consent-confirmation-panel.tsx`
- Nango Connect UI integration behind flags and explicit consent — `apps/applyflow/src/components/dashboard/provider-nango-connect-ui.tsx`
- Provider connection status from Nango runtime boundary — `@devflow/career-sync` `provider-connection/runtime-status.ts` and ApplyFlow `provider-connection-status-panel.tsx`
- Server-side Nango connection verification boundary — `@devflow/career-sync` `provider-connection/runtime-verification.ts` and ApplyFlow `nango-connection-verification-boundary.ts`
- Gmail read-only adapter contract — `@devflow/career-sync` `gmail-readonly-adapter/`
- Gmail read-only sandbox adapter — `@devflow/career-sync` `createGmailReadOnlySandboxAdapter`
- Gmail read-only Nango runtime adapter — ApplyFlow `executeApplyFlowGmailReadOnlyRuntimeBoundary`
- Calendar read-only adapter contract — `@devflow/career-sync` `calendar-readonly-adapter/`
- Calendar read-only sandbox adapter — `@devflow/career-sync` `createCalendarReadOnlySandboxAdapter`
- Calendar read-only Nango runtime adapter — ApplyFlow `executeApplyFlowCalendarReadOnlyRuntimeBoundary`
- Provider-derived runtime composition — ApplyFlow `executeApplyFlowProviderDerivedRuntimeBoundary`
- Provider-derived runtime preview — ApplyFlow `POST /provider-runtime/nango/derived-preview` (explicit click, no persistence)
- Provider-derived runtime review — ApplyFlow in-memory review of preview signals (select/dismiss locally; no persistence, no CareerBundle mutation)
- Provider-derived enrichment proposal — ApplyFlow ephemeral enrichment proposal from selected signals (no persistence, no CareerBundle mutation)
- Provider-derived enrichment proposal export — ApplyFlow local JSON download of ready proposals (browser-only, no upload)
- Provider-derived enrichment proposal export validation — standalone v1 document validator in `@devflow/career-sync` (pure, no import/persistence)
- Provider-derived enrichment proposal export lifecycle and trust model — [integrations/PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md](./integrations/PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md); ADR: [ADR-002](../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md)
- Provider-derived career insights (read-only) — ApplyFlow in-memory insights panel — [integrations/PROVIDER-DERIVED-CAREER-INSIGHTS.md](./integrations/PROVIDER-DERIVED-CAREER-INSIGHTS.md)
- Provider-derived enrichment change preview — read-only current vs. proposed comparison — [integrations/PROVIDER-DERIVED-ENRICHMENT-CHANGE-PREVIEW.md](./integrations/PROVIDER-DERIVED-ENRICHMENT-CHANGE-PREVIEW.md)
- Current CareerBundle enrichment wiring (change preview baseline) — optional dashboard export-shape baseline — [integrations/PROVIDER-DERIVED-ENRICHMENT-CHANGE-PREVIEW.md](./integrations/PROVIDER-DERIVED-ENRICHMENT-CHANGE-PREVIEW.md#optional-current-baseline-dashboard)
- Provider-derived enrichment export composition — transient provider-derived enrichment in dashboard export preview — [integrations/PROVIDER-DERIVED-ENRICHMENT-EXPORT-COMPOSITION.md](./integrations/PROVIDER-DERIVED-ENRICHMENT-EXPORT-COMPOSITION.md)
- Export source visibility + Interview Lab handoff validation — [integrations/PROVIDER-DERIVED-EXPORT-HANDOFF-VALIDATION.md](./integrations/PROVIDER-DERIVED-EXPORT-HANDOFF-VALIDATION.md)
- Enrichment application threat model — [PROVIDER-DERIVED-ENRICHMENT-APPLICATION-THREAT-MODEL.md](./integrations/PROVIDER-DERIVED-ENRICHMENT-APPLICATION-THREAT-MODEL.md); [ADR-003](../adr/ADR-003-PROVIDER-DERIVED-ENRICHMENT-APPLICATION-DEFERRED.md)
- Enrichment application contract architecture — [PROVIDER-DERIVED-ENRICHMENT-APPLICATION-CONTRACT-ARCHITECTURE.md](./integrations/PROVIDER-DERIVED-ENRICHMENT-APPLICATION-CONTRACT-ARCHITECTURE.md); [ADR-004](../adr/ADR-004-ENRICHMENT-APPLICATION-CONTRACT-ARCHITECTURE-PROPOSED.md) (Proposed)
- **Enrichment apply workflow** — **explicitly deferred** ([ADR-003](../adr/ADR-003-PROVIDER-DERIVED-ENRICHMENT-APPLICATION-DEFERRED.md)); implementation **blocked** until implementation gate approved
- **Import workflow (proposal export)** — **explicitly deferred** — not planned in current cycle
- Provider-derived runtime-neutral signal IDs — shared deterministic internal ID format (`createProviderDerivedSignalId`)
- Unified sync enrichment contract — canonical validator (`validateCareerBundleUnifiedSyncEnrichment`)
- Provider-derived sandbox composition — `@devflow/career-sync` `composeProviderDerivedSignals`
- Provider-derived enrichment adapter — `@devflow/career-sync` `adaptProviderDerivedSignalsToSyncEnrichment`

### ApplyFlow consent panel action simulation

The ApplyFlow provider consent mock panel can simulate connect/revoke/delete-derived-data actions locally through the `@devflow/career-sync` provider connection action mock.

The simulation remains read-only and does not start OAuth, call providers, store tokens, persist provider data, or run sync jobs.

### Provider consent mock panel

ApplyFlow includes a read-only provider consent preview panel that demonstrates the future consent-based Gmail/Calendar integration model without activating OAuth, Nango runtime, provider calls, token storage, or sync jobs.

### ApplyFlow consent mock wired to provider connection model

The ApplyFlow provider consent mock panel now renders fake/sandbox provider connection snapshots using the pure connection status model from `@devflow/career-sync`.

This remains read-only and does not activate OAuth, Nango runtime, provider calls, token storage, persistence, or sync jobs.

**Current status:**

- Demo/sandbox sync enrichment loop is complete.
- Gmail read-only Nango runtime (metadata-only, server-side) is **implemented** behind flags and consent.
- Calendar read-only Nango runtime (metadata-only, server-side) is **implemented** behind flags and consent.
- Provider-derived runtime composition (Gmail + Calendar signals) is **implemented** — no CareerBundle auto-attach.
- Provider-derived runtime preview (opt-in HTTP + UI) is **implemented** — ephemeral, no persistence; server independently verifies both Nango connections (client state is UX-only).
- Provider-derived runtime review (in-memory UI) is **implemented** — users select or dismiss preview signals locally; nothing is saved, applied to CareerBundle, or sent to providers.
- Provider-derived enrichment proposal (in-memory UI) is **implemented** — users can build a temporary enrichment proposal from selected signals; nothing is saved or applied automatically.
- Provider-derived enrichment proposal export (browser download) is **implemented** — users can download a ready proposal as local JSON; ApplyFlow does not upload or retain the file.
- Provider-derived enrichment proposal export validation is **implemented** — `@devflow/career-sync` validates v1 export documents without import or persistence.
- Provider-derived enrichment proposal export lifecycle and trust model is **documented** — export-only artifact; lifecycle ends at download ([lifecycle doc](./integrations/PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md), [ADR-002](../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md)).
- Provider-derived career insights (read-only panel) is **implemented** — aggregated session metrics only; no persistence ([career insights doc](./integrations/PROVIDER-DERIVED-CAREER-INSIGHTS.md)).
- Provider-derived enrichment change preview is **implemented** — read-only current vs. proposed comparison; no apply ([change preview doc](./integrations/PROVIDER-DERIVED-ENRICHMENT-CHANGE-PREVIEW.md)).
- Current CareerBundle enrichment wiring for change preview baseline is **implemented** — optional dashboard export-shape `syncEnrichment`; falls back to `null` when unavailable ([change preview doc](./integrations/PROVIDER-DERIVED-ENRICHMENT-CHANGE-PREVIEW.md#optional-current-baseline-dashboard)).
- Provider-derived enrichment export composition is **implemented** — eligible ready proposals compose into transient export preview; no auto-export ([export composition doc](./integrations/PROVIDER-DERIVED-ENRICHMENT-EXPORT-COMPOSITION.md)).
- Export source visibility and Interview Lab handoff validation are **implemented** — single composition policy across preview, handoff, and download ([handoff validation doc](./integrations/PROVIDER-DERIVED-EXPORT-HANDOFF-VALIDATION.md)).
- Enrichment application threat model is **documented** — apply remains explicitly deferred ([threat model](./integrations/PROVIDER-DERIVED-ENRICHMENT-APPLICATION-THREAT-MODEL.md), [ADR-003](../adr/ADR-003-PROVIDER-DERIVED-ENRICHMENT-APPLICATION-DEFERRED.md)).
- Enrichment application contract architecture is **proposed** — contracts and gates for review; implementation **blocked** ([contract architecture](./integrations/PROVIDER-DERIVED-ENRICHMENT-APPLICATION-CONTRACT-ARCHITECTURE.md), [ADR-004](../adr/ADR-004-ENRICHMENT-APPLICATION-CONTRACT-ARCHITECTURE-PROPOSED.md)).
- **Enrichment apply workflow: explicitly deferred** — implementation blocked until implementation gate approved; not part of the current lifecycle.
- **Import workflow (proposal export): explicitly deferred** — separate from application ([ADR-002](../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md)).
- Background sync and CareerBundle auto-enrichment from runtime are **explicitly out of scope** for the current read-only lifecycle.

### Next

- Runtime enrichment adapter wiring (no CareerBundle auto-attach)
- **Do not assume** proposal export import — deferred per [ADR-002](../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md)

### Future roadmap

- Gmail/Calendar provider connectors with least-data boundaries
- Recording notes and LinkedIn publish pack
- Multi-agent advisory layer over deterministic signals
- LibreChat / MCP lab demonstration over deterministic signals

---

## Execution principles

- **Local-first** — career data stays on the device unless the user explicitly exports or opts into a future sync.
- **Privacy-first** — no mandatory remote persistence for MVP; no silent uploads.
- **Deterministic core before AI** — every module exposes reproducible behaviour before any LLM adapter.
- **AI opt-in** — adapters may enrich outputs; they must not replace core contracts or scoring.
- **No auto-submit** — ApplyFlow never submits applications on behalf of the user.
- **No backend required for MVP** — Career Suite handoff works without a DevFlow Career API.
- **CareerBundle as protocol** — `@devflow/career-core` JSON is the central contract between apps and future agents.

---

## Roadmap

### Phase 1 — Documentation and contracts

Define execution plan, module contracts, and architecture boundaries **before** new package code.

**Deliverables:** this file, `AGENT-CONTRACTS.md`, `AGENT-ARCHITECTURE.md`.

### Phase 2 — `career-agents` package foundation

Create `packages/career-agents/` with workspace wiring, shared schemas, test fixtures, README — **no** external agent frameworks.

**Planned layout:** `job-analysis/`, `resume-analysis/`, `shared/`, Vitest, Zod.

### Phase 3 — Deterministic job-analysis

Implement `analyzeJob()` — normalized role, seniority, required/nice-to-have skills, domain signals, risk flags, interview topics.

### Phase 4 — Deterministic resume-analysis

Implement `analyzeResume()` — normalized skills, seniority signals, evidence strength, gaps, portfolio opportunities.

### Phase 5 — Deterministic match (ATS layer)

Implement `matchJobToResume()` — score, missing keywords, evidence gaps, suggested improvements (deterministic; aligns with Interview Lab Resume Match evolution).

### Phase 6 — Interview Lab integration

Interview Lab consumes `career-agents` for Resume Match and practice prep — **consistent gaps**, practice from real analysis, **no mandatory AI**.

### Phase 7 — LibreChat + MCP lab

Optional **local lab** for agent interaction and MCP tooling — **after** deterministic modules and contracts are stable. Not a runtime dependency of ApplyFlow or Interview Lab MVP.

### Phase 8 — Nango Gmail / Calendar sync

Optional sync for application timeline and interview scheduling — **after** core protocol and analyzers. Explicit user consent; not required for demo path.

### Phase 9 — Multi-agent orchestration

Orchestration layer only when single-module contracts are proven in tests and Interview Lab integration.

### Phase 10 — OpenClaw proof of concept

Automation POC with **human approval** — exploratory; does not replace deterministic scoring or CareerBundle handoff.

---

## PR sequence

| PR | Title (suggested) | Scope |
|----|-------------------|--------|
| **1** | `chore: add Career Suite roadmap execution plan` | Docs only — this plan + contracts + architecture |
| **2** | `feat: add career-agents package foundation` | `packages/career-agents/` scaffold, shared schemas, fixtures, tests |
| **3** | `feat: add deterministic job-analysis` | `analyzeJob()` + unit tests |
| **4** | `feat: add deterministic resume-analysis` | `analyzeResume()` + unit tests |
| **5** | `feat: integrate Interview Lab with career agents` | Consume package in Resume Match / practice prep |
| **6** | `docs: add LibreChat MCP lab notes` | Lab setup docs; no product coupling |
| **7** | `feat: add Nango sync foundation` | Optional Gmail/Calendar — behind feature flag |
| **8** | `feat: add multi-agent orchestration` | After modules stable |
| **9** | `chore: add OpenClaw POC` | Proof of concept only |

Keep **docs-only PRs** separate from **product logic PRs**. Do not mix WhatsApp, Financeiro, or unrelated CI refactors into Career Suite execution PRs.

---

## Definition of done (per phase)

- **Documentation** — contracts reviewed; links from `docs/career-suite/README.md`.
- **Package / module** — Vitest coverage for deterministic paths; Zod schemas for inputs/outputs.
- **Integration** — Interview Lab uses shared analyzers; no duplicate heuristics without migration plan.
- **AI adapter** — optional module; core tests pass with AI disabled.
- **External integration** — documented opt-in; never required for local-first demo.

**Global gates:**

- No product logic in docs-only PRs.
- No integration before contracts (`AGENT-CONTRACTS.md`).
- No LLM-only scoring replacing deterministic baseline.

---

## Out of scope (until explicitly scheduled)

- Replacing `@devflow/career-core` CareerBundle schema without version bump and migration notes.
- Mandatory cloud sync or DevFlow-hosted career API for MVP.
- Mass apply, auto-submit, or scraping-first architecture.
- Bundling LibreChat, Nango, or OpenClaw as required dependencies of ApplyFlow or Interview Lab builds.
