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
| LibreChat / Nango / OpenClaw | **Not** MVP dependencies — accelerators after core |

**Next step:** LibreChat/MCP lab over deterministic signals; real Nango OAuth only after explicit consent UX.

### ApplyFlow opt-in sync enrichment export

ApplyFlow can export a CareerBundle with optional **demo/sandbox** sync enrichment when explicitly enabled by the user on the dashboard export card. This does not connect to Gmail or Google Calendar, does not use Nango runtime, does not fetch provider data, and does not include raw provider payloads or meeting links.

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

### Future — after current stack

- Real Nango OAuth integration behind explicit user consent
- LibreChat / MCP lab demonstration over deterministic signals
- Multi-agent advisory layer over derived signals (not replacement of deterministic core)

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
