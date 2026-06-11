# Career Agent Architecture

How Career Suite modules layer from **protocol** → **deterministic analyzers** → **optional AI** → **integrations** → **orchestration**.

**Contracts:** [`AGENT-CONTRACTS.md`](./AGENT-CONTRACTS.md) · **PR order:** [`ROADMAP-EXECUTION.md`](./ROADMAP-EXECUTION.md)

---

## Layers

```text
┌─────────────────────────────────────────────────────────────┐
│ 5. Orchestration (multi-agent — Phase 9+)                   │
├─────────────────────────────────────────────────────────────┤
│ 4. Integrations (Nango, LibreChat/MCP lab — Phase 7–8)      │
├─────────────────────────────────────────────────────────────┤
│ 3. Optional AI adapters (opt-in, enrich only)               │
├─────────────────────────────────────────────────────────────┤
│ 2. Deterministic analyzers (career-agents)                  │
├─────────────────────────────────────────────────────────────┤
│ 1. CareerBundle protocol (@devflow/career-core)              │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Responsibility | Apps / packages |
|-------|----------------|-----------------|
| **1. Protocol** | Typed handoff, validation, application rows | `@devflow/career-core`, ApplyFlow export, Interview Lab import |
| **2. Deterministic analyzers** | Job, resume, match, coach (rules + fixtures) | `packages/career-agents` (planned) |
| **3. AI adapters** | Optional enrichment; same I/O contracts | App-local or package `*/ai-adapter` subpaths — **never required** |
| **4. Integrations** | External tools (email, calendar, chat lab) | Behind flags; documented separately |
| **5. Orchestration** | Multi-step flows across modules | After single-module stability |

**Rule:** Lower layers do not depend on higher layers. Interview Lab may call layer 2 directly; layer 4 never replaces layer 2 scoring.

---

## Current state (merged MVP)

| Component | Layer | Notes |
|-----------|-------|-------|
| ApplyFlow dashboard + extension | Protocol producer | History → CareerBundle |
| Interview Lab `/import/applyflow` | Protocol consumer | Parses bundle, practice prep |
| Interview Lab `/career/ats` | Layer 2 (in-app) | Deterministic heuristics today; candidate for `career-agents` extraction |
| AI Resume Coaching / AI Answer Review | Layer 3 | Browser opt-in OpenAI only |

---

## Package plan — `packages/career-agents`

**Status:** Planned (Phase 2). Not present in repo until PR 2.

**Purpose:** Shared deterministic analyzers for Interview Lab, future ApplyFlow insights, and agent experiments — **without** pulling in LibreChat, Nango, or OpenClaw.

**Planned modules:**

| Module | Primary API (planned) | Depends on |
|--------|----------------------|------------|
| `shared` | Zod schemas, canonical skill tokens, seniority enums, test fixtures | `@devflow/career-core` types where aligned |
| `job-analysis` | `analyzeJob(input)` | `shared` |
| `resume-analysis` | `analyzeResume(input)` | `shared` |
| `ats-analysis` | `matchJobToResume(job, resume)` | `job-analysis`, `resume-analysis` |
| `interview-coach` | `buildInterviewCoachPlan(...)` | `ats-analysis` |
| `career-strategy` | `buildCareerStrategy(...)` | multiple bundles — later phase |

**Testing:** Vitest per module; golden files for JD/resume pairs; no network in unit tests.

**Build:** NodeNext / workspace package consistent with `@devflow/career-core` (exact `package.json` in PR 2).

---

## App integration (Phase 6 target)

```text
ApplyFlow ──CareerBundle──► Interview Lab
                                │
                                ├─► career-agents.job-analysis
                                ├─► career-agents.resume-analysis
                                ├─► career-agents.ats-analysis
                                └─► practice / briefing UI (localStorage)
```

- **No new backend** for the integration PR.
- Replace or wrap in-app ATS heuristics incrementally; keep UX and privacy copy unchanged unless product review says otherwise.

---

## Future integrations

### LibreChat + MCP

- **Use first as a local lab** for experimenting with tool calls and agent prompts against **stable** `career-agents` outputs.
- MCP tools should read/write **CareerBundle-shaped JSON**, not bypass schema validation.
- **Not** a dependency of production ApplyFlow or Interview Lab builds.

### Nango (Gmail / Google Calendar)

- **Use later** for optional timeline sync (application dates, interview slots).
- Requires explicit OAuth and user consent; data minimization documented per integration PR.
- **Not** required for local-first demo or public case study.

### Multi-agent architecture

- Introduced **only after** deterministic modules have tests and Interview Lab consumes them.
- Orchestrator coordinates existing module APIs — does not embed scoring logic inline.

### OpenClaw

- **Proof-of-concept only** — automation with **human approval** (e.g. draft follow-up, never auto-send).
- Does not replace ApplyFlow safety gates (no auto-submit).

---

## Non-goals

- **No auto-submit** — LinkedIn submission stays human.
- **No scraping-first architecture** — Career data from user-controlled export/import, not covert page scraping as the primary model.
- **No backend-required MVP** — Career Suite demo path works offline/local.
- **No replacing deterministic scoring with LLM-only output** — match scores and gap lists must have a documented deterministic baseline.
- **No mandatory LibreChat, Nango, or OpenClaw** in CI, install, or runtime for Career Suite apps.

---

## Security and tenancy note

Career Suite modules process **user-owned career text** on the client. Multi-tenant rules for WhatsApp Platform **do not apply** to `career-agents` analyzers; keep packages free of Supabase/session assumptions unless a future server phase is explicitly designed and reviewed.
