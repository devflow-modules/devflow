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
- Real provider integration is **not implemented yet**.
- Architecture, safety gates, adapter contracts, and Nango sandbox adapter are defined before any OAuth runtime.

### Next

- Real connection status verification from Nango server boundary
- Gmail read-only adapter after connection boundary is validated
- Calendar read-only adapter after connection boundary is validated

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
