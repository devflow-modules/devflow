# Resume agent (`resume_analyst`)

Deterministic resume analysis inside the existing multi-agent boundary. Routed only from the
`analyze_resume` intent. No new orchestrator, endpoint, provider, LLM layer, tool boundary,
automation, persistence, memory, or background job is introduced.

## Flow

```txt
client-safe request
→ deterministic intent resolution (analyze_resume → resume_analyst)
→ server-owned agent selection
→ deterministic analysis (analyze_resume_structure)
→ optional controlled LLM draft (generate_resume_improvement_explanation)
→ human review
→ proposal/export only
```

## Responsibilities

- Analyze resume structure, clarity, and legibility.
- Check coherence between summary, experience, projects, and skills.
- Detect missing evidence and vague bullets.
- Recommend impact improvements and section reordering.
- Identify exaggeration / unverifiable-claim risks.
- Produce client-safe improvements for human review.

## Allowed inputs (`context.analysisInput`)

- `resumeSnapshot` — `summary?`, `skills[]`, `experiences[]` (`title`, `company`, `bullets[]`), `projects?`, `education?`
- `targetRole`, `targetSeniority`, `targetStack[]`
- `optionalJobSnapshot` (via `jobSnapshot`)

Never accepted: arbitrary files, URLs, HTML, scripts, commands, filesystem paths, provider tokens,
raw email, or any agent/task/model/tool/capability/approval selector.

## Output (minimum)

```ts
{
  score: number;                 // deterministic 0..100
  strengths: string[];
  weaknesses: string[];
  missingEvidence: string[];
  bulletRecommendations: Array<{ section: string; originalSummary: string; recommendation: string; reason: string }>;
  sectionRecommendations: string[];
  risks: string[];
  nextActions: string[];
  reviewRequired: true;
}
```

## Deterministic rules (documented score rubric, 0..100)

- Summary present: +15
- Skills (up to 8 counted): up to +15
- Quantified bullets ratio: up to +30
- Low vagueness (1 − vague ratio): up to +25
- Projects present: +7.5 · Education present: +7.5

A bullet is **vague** when it has fewer than 6 words, or lacks both a leading action verb and a
measurable result. The same input always yields the same output.

## LLM role

The optional LLM only explains/organizes results and improves clarity for a draft. It never
computes the score, invents metrics or skills, adds experience, decides agent/tool, executes
actions, persists content, or modifies the CareerBundle.

## Non-goals

- No full automatic rewrite.
- No invented metrics, skills, or experience.
- No auto-apply, mutation, persistence, or background work.

## Risks

- Treat every suggested rewrite as a draft; keep only factual changes.
- Missing-evidence items must reflect real experience before being added.

## Example

Request (chat): action `analyze_resume`, with a `resumeSnapshot` and `targetStack`. Response:
deterministic `resumeAnalysis` plus a non-executable `career.prepare_resume_review` proposal,
`reviewRequired: true`, `safeForClient: true`, `hasToken: false`, `persisted: false`,
`toolExecutionOccurred: false`.
