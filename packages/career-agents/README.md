# @devflow/career-agents

Deterministic Career Suite agent core — local keyword heuristics for job analysis, resume analysis, and ATS-style matching.

**Not included in this package:** OpenAI/LLM adapters, LibreChat, Nango, MCP, OpenClaw, or network I/O.

## Principles

- **Local-first** — runs in Node or the browser bundle; no server required.
- **Privacy-first** — no persistence and no remote calls in this package.
- **Deterministic before AI** — same input → same output; AI adapters are future optional layers.
- **Small API** — stable contracts aligned with [`docs/career-suite/AGENT-CONTRACTS.md`](../../docs/career-suite/AGENT-CONTRACTS.md).

## Modules

| Module | Export | Role |
|--------|--------|------|
| `job-analysis` | `analyzeJob(input)` | Seniority, skills, domain signals, interview topics |
| `resume-analysis` | `analyzeResume(input)` | Normalized skills, evidence, portfolio hints |
| `ats-analysis` | `matchJobToResume(job, resume)` | Score 0–100, gaps, suggestions |
| `shared` | normalize + scoring helpers | Keyword catalog, dedupe, ATS formula |

## Usage

```ts
import {
  analyzeJob,
  analyzeResume,
  matchJobToResume,
  sampleJobInput,
  sampleResumeInput,
} from "@devflow/career-agents";

const job = analyzeJob(sampleJobInput);
const resume = analyzeResume(sampleResumeInput);
const match = matchJobToResume(job, resume);

console.log(match.score, match.missingSkills);
```

## Scripts

```bash
pnpm --filter @devflow/career-agents build
pnpm --filter @devflow/career-agents typecheck
pnpm --filter @devflow/career-agents test
```

## Roadmap

See [`docs/career-suite/ROADMAP-EXECUTION.md`](../../docs/career-suite/ROADMAP-EXECUTION.md) — Interview Lab integration and richer heuristics land in follow-up PRs.
