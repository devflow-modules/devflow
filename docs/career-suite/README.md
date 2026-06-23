# DevFlow Career Suite

> **Local-first · privacy-first · human-reviewed** — modular career workflow connecting applications, provider-derived context, and interview preparation.

**Full product & architecture case (recruiters, engineers, partners):**  
**[CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md](./CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md)**

**Public portfolio narrative:** [`../public-cases/CAREER-SUITE.md`](../public-cases/CAREER-SUITE.md)  
**Portfolio launch package (LinkedIn, CV, interviews):** [`CAREER-SUITE-PORTFOLIO-LAUNCH-PACKAGE.md`](./CAREER-SUITE-PORTFOLIO-LAUNCH-PACKAGE.md)

---

## Overview

| Piece | Role |
|-------|------|
| **ApplyFlow** | Applications dashboard + provider-derived read-only enrichment path |
| **Interview Lab** | Import, Resume Match, practice |
| **CareerBundle** | Typed JSON handoff (`@devflow/career-core`) |
| **career-sync** | Provider signal contracts + enrichment builder |

**Current product posture:** read-only provider-derived lifecycle **complete** through export/handoff. **Apply** and proposal **import** are **explicitly deferred** (ADR-002, ADR-003).

![ApplyFlow dashboard — demo carregado, funil e exportação local para Interview Lab](./assets/01-applyflow-dashboard.png)

*Dashboard com ~20 candidaturas fictícias. Galeria completa e estados bloqueados: [assets checklist](./assets/README.md).*

---

## User journey (summary)

```txt
Organize applications → optional provider signals → manual review
→ proposal → change preview → CareerBundle composition
→ Interview Lab handoff / export → lifecycle ends
```

Detail: [case §5](./CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md#5-end-to-end-user-journey)

---

## Architecture

```mermaid
flowchart LR
  User --> ApplyFlow
  ApplyFlow --> ProviderRuntime
  ProviderRuntime --> SafeSignals
  SafeSignals --> Review
  Review --> Proposal
  Proposal --> CareerBundle
  CareerBundle --> InterviewLab
  CareerBundle --> LocalExport
```

Boundaries and packages: [case §6](./CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md#6-architecture-overview)

---

## Agent layer (PRs #114–#118)

Deterministic, policy-gated agent/automation stack — consolidated technical presentation:

```txt
metadata → signals → timeline → orchestrator → tool permission
→ chat adapter → controlled LLM → approved automation
```

| Doc | Content |
|-----|---------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | End-to-end flow, PR #114–#118 map (responsibilities + guarantees), key concepts |
| **[DEMO.md](./DEMO.md)** | Client-safe visual walkthrough (Career Chat · AI Draft · Approved Automation) |
| Per-boundary docs | [`agents/`](./agents/) · ADRs [005](../adr/ADR-005-CAREER-AGENT-ORCHESTRATION-BOUNDARY.md)–[009](../adr/ADR-009-APPROVED-AUTOMATION-EXECUTION-BOUNDARY.md) |

**Principles:** deterministic-first · server-authoritative · human-in-the-loop · no auto-apply ·
no silent persistence · temporary approvals · LLM without authority · automation without permanent autonomy.

### Specialist agents (PR #123)

Three deterministic specialist agents reuse the existing boundary (no new orchestrator, endpoint,
provider, LLM layer, tool boundary, automation, or persistence):

| Intent | Agent | Doc |
|--------|-------|-----|
| `analyze_resume` | `resume_analyst` | [RESUME-AGENT](./agents/RESUME-AGENT.md) |
| `analyze_ats_compatibility` | `ats_analyst` | [ATS-AGENT](./agents/ATS-AGENT.md) |
| `plan_career_strategy` | `career_strategy_advisor` | [CAREER-STRATEGY-AGENT](./agents/CAREER-STRATEGY-AGENT.md) |

The ATS compatibility score is deterministic and bounded (0–100); the LLM only explains results.
Each agent emits a non-executable review proposal for human review.

### Production pilot readiness

Operational layer for a controlled pilot (no new agents/providers/automations/persistence):
environment matrix, config validation, aggregated health + `livez`/`readyz`, client-safe
observability + in-memory metrics, pilot mode + consent-gated feedback, and an internal
diagnostic page. See [`PRODUCTION-READINESS.md`](./PRODUCTION-READINESS.md),
[`DEPLOYMENT.md`](./DEPLOYMENT.md), [`OBSERVABILITY.md`](./OBSERVABILITY.md),
[`PILOT-VALIDATION.md`](./PILOT-VALIDATION.md), [`PILOT-RUNBOOK.md`](./PILOT-RUNBOOK.md),
[`PRODUCT-UX-READINESS-REVIEW.md`](./PRODUCT-UX-READINESS-REVIEW.md),
[`UI-UX-POLISH.md`](./UI-UX-POLISH.md), [`SIMPLIFIED-INPUT-UX.md`](./SIMPLIFIED-INPUT-UX.md), and
[`SECURITY-CHECKLIST.md`](./SECURITY-CHECKLIST.md).

**Pilot operational status (2026-06-23):** `P01 READY TO SCHEDULE` — PR #139 merged; resume analysis quality validated on `main` Preview.

---

## Trust model

- Provider raw does not reach the UI
- Manual review before proposals
- Explicit export/handoff only
- Import deferred · Apply deferred · mutation blocked

ADRs: [002](../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md) · [003](../adr/ADR-003-PROVIDER-DERIVED-ENRICHMENT-APPLICATION-DEFERRED.md) · [004](../adr/ADR-004-ENRICHMENT-APPLICATION-CONTRACT-ARCHITECTURE-PROPOSED.md) (Proposed)

---

## Current status

| Area | State |
|------|--------|
| CareerBundle handoff | **Implemented** |
| Provider-derived preview → export | **Implemented** |
| Change preview + composition source | **Implemented** |
| Threat model | **Documented** |
| Contract architecture | **Proposed** |
| Enrichment apply | **Deferred** |
| Proposal import | **Deferred** |

Capability table: [case §14](./CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md#14-current-capabilities)

---

## Quickstart

```bash
pnpm install
pnpm --filter @devflow/career-core build
pnpm --filter @devflow/career-sync build
pnpm --filter applyflow dev          # http://localhost:3010/dashboard
pnpm --filter @devflow/app-interview-lab dev  # http://localhost:3015
```

Tests (1,045 across Career Suite packages): [case §12](./CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md#12-testing-strategy)

---

## Deep documentation

| Topic | Link |
|-------|------|
| **Product & architecture case** | [CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md](./CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md) |
| **Portfolio launch package** | [CAREER-SUITE-PORTFOLIO-LAUNCH-PACKAGE.md](./CAREER-SUITE-PORTFOLIO-LAUNCH-PACKAGE.md) · [LinkedIn](./portfolio/LINKEDIN-LAUNCH-POSTS.md) · [Video](./portfolio/VIDEO-SCRIPTS.md) · [Evidence](./portfolio/EVIDENCE-AND-CLAIMS-MATRIX.md) |
| **Closed pilot runbook** | [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) |
| **P01 operational kit** | [P01-OPERATIONAL-KIT.md](./P01-OPERATIONAL-KIT.md) |
| **Product & UX readiness review** | [PRODUCT-UX-READINESS-REVIEW.md](./PRODUCT-UX-READINESS-REVIEW.md) |
| **UI/UX product polish (pilot)** | [UI-UX-POLISH.md](./UI-UX-POLISH.md) |
| **Simplified participant inputs (P01 gate)** | [SIMPLIFIED-INPUT-UX.md](./SIMPLIFIED-INPUT-UX.md) |
| Roadmap execution | [ROADMAP-EXECUTION.md](./ROADMAP-EXECUTION.md) |
| Provider integrations | [integrations/README.md](./integrations/README.md) |
| Demo walkthrough | [demo/CAREER-SUITE-WALKTHROUGH.md](./demo/CAREER-SUITE-WALKTHROUGH.md) |
| Resume Match case | [RESUME-MATCH-CASE-STUDY.md](./RESUME-MATCH-CASE-STUDY.md) |
| Screenshot checklist | [assets/README.md](./assets/README.md) |
| Verified screenshots | [01 dashboard](./assets/01-applyflow-dashboard.png) · [05 composition](./assets/05-export-composition-source.png) · [06 handoff](./assets/06-interview-lab-handoff.png) |
| Agent architecture | [AGENT-ARCHITECTURE.md](./AGENT-ARCHITECTURE.md) |
| Agent layer (PRs #114–#118) | [ARCHITECTURE.md](./ARCHITECTURE.md) · [DEMO.md](./DEMO.md) · [agents/](./agents/) |

---

## App READMEs

- [`apps/applyflow/README.md`](../../apps/applyflow/README.md)
- [`apps/interview-lab/README.md`](../../apps/interview-lab/README.md)
- [`apps/applyflow-extension/README.md`](../../apps/applyflow-extension/README.md)
