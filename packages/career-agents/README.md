# @devflow/career-agents

Deterministic Career Suite agent core — local keyword heuristics for job analysis, resume analysis, and ATS-style matching.

**Not included in this package:** OpenAI/LLM adapters, LibreChat, Nango, MCP, OpenClaw, or network I/O.

## Principles

- **Local-first** — runs in Node or the browser bundle; no server required.
- **Privacy-first** — no persistence and no remote calls in this package.
- **Deterministic before AI** — same input → same output; AI adapters are future optional layers.
- **Small API** — stable contracts with optional enriched fields (`skillGroups`, `scoreBreakdown`, `gapSeverity`).

## Modules

| Module | Export | Role |
|--------|--------|------|
| `job-analysis` | `analyzeJob(input)` | Seniority, skills, domain/risk signals, skill groups |
| `resume-analysis` | `analyzeResume(input)` | Normalized skills, evidence levels, portfolio hints |
| `ats-analysis` | `matchJobToResume(job, resume)` | Score 0–100, breakdown, gap severity |
| `shared` | normalize + scoring helpers | Alias catalog, dedupe, ATS formula |

## Usage

### Basic pipeline

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

### Realistic fixtures

```ts
import {
  analyzeJob,
  analyzeResume,
  matchJobToResume,
  sampleFullstackSaasJob,
  sampleSeniorProductEngineerResume,
} from "@devflow/career-agents";

const job = analyzeJob(sampleFullstackSaasJob);
const resume = analyzeResume(sampleSeniorProductEngineerResume);
const match = matchJobToResume(job, resume);

console.log({
  score: match.score,
  breakdown: match.scoreBreakdown, // requiredScore + niceToHaveScore === score
  gaps: match.gapSeverity,         // high | medium | low
  domain: job.domainSignals,
  risks: job.riskFlags,
});
```

### Skill aliases

Aliases normalize to canonical names (`nextjs` → `Next.js`, `ts` → `TypeScript`, `tailwindcss` → `Tailwind CSS`):

```ts
import { extractKnownSkills, resolveCanonicalSkillName } from "@devflow/career-agents";

resolveCanonicalSkillName("nextjs"); // "Next.js"
extractKnownSkills("REST API, JWT auth, OAuth2"); // REST, JWT, OAuth
```

## Output highlights

**Job analysis** adds optional `skillGroups`, `seniorityEvidence`, and `requirementsDensity`.

**Resume analysis** adds optional `skillEvidence` per skill (`strong` | `weak` | `listed`).

**ATS match** adds optional `scoreBreakdown` and `gapSeverity`:

- `high` — required skill absent
- `medium` — required skill present without strong evidence
- `low` — nice-to-have absent

## Scripts

```bash
pnpm --filter @devflow/career-agents build
pnpm --filter @devflow/career-agents typecheck
pnpm --filter @devflow/career-agents test
```

## Roadmap

Interview Lab integration and richer heuristics land in follow-up PRs after this deterministic core stabilizes.
