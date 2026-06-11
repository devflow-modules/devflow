# LibreChat + MCP Lab for Career Suite

> **Lab only.** LibreChat is an experimentation surface for Career Suite agents. It is **not** the Career Suite runtime, not a production dependency, and not required for ApplyFlow or Interview Lab.

## Purpose

Use [LibreChat](https://github.com/danny-avila/LibreChat) as a **local experimentation UI** to:

- Invoke deterministic Career Suite tools via MCP
- Explore how an LLM **explains** gaps, scores, and next actions
- Validate privacy boundaries before any product coupling

The lab answers: *“Can we give power users a chat interface over the same deterministic core, without weakening local-first guarantees?”*

## Positioning

| Layer | Role |
|-------|------|
| **Product runtime** | ApplyFlow + Interview Lab + `@devflow/career-agents` (browser/local) |
| **LibreChat** | Optional **lab interface** — chat UX for developers and internal experiments |
| **MCP servers** | Thin adapters that call `@devflow/career-agents` and `@devflow/career-core` |
| **LLM (inside LibreChat)** | **Opt-in explainer** — narrates tool output; does **not** own the ATS score |

LibreChat/MCP **must not** become a mandatory backend for end users in the MVP Career Suite story.

## Existing core (do not replace)

- **`@devflow/career-agents`** — `analyzeJob`, `analyzeResume`, `matchJobToResume`, `scoreBreakdown`, `gapSeverity`
- **`CareerBundle` JSON** — Zod-validated handoff (`@devflow/career-core`)
- **ApplyFlow** — applications, export, handoff to Interview Lab
- **Interview Lab** — import, Resume Match (`/career/ats`), practice prep, optional OpenAI coaching (explicit click)

Any lab tool that returns a “match score” should **call the package** and return its output — not reimplement heuristics in the LLM or MCP layer.

## Candidate agent tools (MCP)

Initial tool set mapped to the deterministic core:

| Tool | Maps to | Notes |
|------|---------|--------|
| `analyze_job` | `analyzeJob()` | Job description → seniority, skills, risk/domain signals |
| `analyze_resume` | `analyzeResume()` | Structured or parsed resume → skills, evidence levels |
| `match_resume_to_job` | `matchJobToResume()` | Full pipeline; returns `score`, `scoreBreakdown`, `gapSeverity` |
| `generate_interview_topics` | `JobAnalysisOutput.interviewTopics` + gap-derived prompts | Deterministic list first; LLM may rephrase in chat |
| `explain_gap_severity` | `AtsMatchOutput.gapSeverity` | Read-only explanation of high/medium/low gaps |
| `suggest_portfolio_project` | `ResumeAnalysisOutput.portfolioOpportunities` | Suggestions from weak/listed skill evidence |

Future tools (Phase 2): CareerBundle validate/summarize — see [MCP-SERVER-CANDIDATES.md](./MCP-SERVER-CANDIDATES.md).

## Data boundaries

Non-negotiable for any lab or product integration:

- **No CareerBundle in URL** — bundle travels via file, clipboard, postMessage, or explicit MCP payload — never query strings
- **No auto-submit** — tools must not apply to jobs, send applications, or post on LinkedIn
- **No mandatory backend** — Interview Lab and ApplyFlow remain usable without LibreChat
- **No remote persistence for MVP** — lab runs should not require DevFlow-hosted storage of resume/JD text
- **AI opt-in only** — deterministic analysis runs without LLM; LibreChat LLM is an optional narration layer
- **No secrets in repo** — API keys and LibreChat config stay in local `.env` (not committed)

## Local lab flow (target)

```mermaid
sequenceDiagram
  participant User
  participant LC as LibreChat (local)
  participant MCP as Career Agents MCP
  participant CA as @devflow/career-agents

  User->>LC: Paste JD + resume or load CareerBundle export
  User->>LC: Ask "How well do I match this role?"
  LC->>MCP: analyze_job + analyze_resume + match_resume_to_job
  MCP->>CA: deterministic functions
  CA-->>MCP: scores, gaps, topics
  MCP-->>LC: structured tool result
  LC-->>User: explanation + optional LLM narrative
  Note over User,CA: Score unchanged by LLM; LLM explains only
```

1. User exports or loads a **CareerBundle** (or pastes resume + job text in chat)
2. MCP tool receives **structured input** (validated where possible)
3. Tool calls **`@devflow/career-agents`** — same code path as Interview Lab adapter
4. LibreChat displays structured result and optional natural-language summary
5. Optional LLM layer **explains** gaps — it does **not** replace `score` or invent matched skills

## Evaluation criteria

Before promoting any lab pattern into product:

| Question | Pass condition |
|----------|----------------|
| Can it call deterministic tools? | MCP invokes `@devflow/career-agents`; outputs match package tests for same input |
| Can it explain gaps clearly? | `gapSeverity` and `scoreBreakdown` surfaced without hallucinated skills |
| Can it preserve privacy boundaries? | No URL bundle leakage; no silent network upload of career data |
| Can it work without product runtime coupling? | ApplyFlow + Interview Lab unchanged if LibreChat is offline |

## Non-goals

- **Production integration** — no LibreChat embed in ApplyFlow or Interview Lab in this phase
- **Automatic applications** — no Easy Apply automation via chat
- **Scraping-first architecture** — job text comes from user/bundle, not headless scrapers in MCP
- **Replacing Interview Lab** — `/career/ats` remains the canonical user-facing Resume Match UX
- **Adding LibreChat to the monorepo** — lab runs against upstream LibreChat locally or in a separate sandbox repo

## Implementation notes (when building the lab)

- Run MCP server as a **separate process** (Node), importing `@devflow/career-agents` from the monorepo via workspace build output or `pnpm` link — still **not** a dependency of `apps/interview-lab`
- Reuse mapping ideas from `apps/interview-lab/src/lib/career-agents-adapter.ts` for plain-text → package inputs
- Add Vitest coverage on MCP tool handlers mirroring adapter tests
- Document local setup in a follow-up PR when the first MCP server lands — **not in this docs-only PR**

## Related

- [Integrations overview](./README.md)
- [MCP server candidates](./MCP-SERVER-CANDIDATES.md)
- [Career Suite README](../README.md)
