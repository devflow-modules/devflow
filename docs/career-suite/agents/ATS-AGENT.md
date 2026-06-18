# ATS agent (`ats_analyst`)

Deterministic ATS compatibility analysis inside the existing multi-agent boundary. Routed only
from the `analyze_ats_compatibility` intent. No new orchestrator, endpoint, provider, LLM layer,
tool boundary, automation, persistence, memory, or background job is introduced.

## Flow

```txt
client-safe request
→ deterministic intent resolution (analyze_ats_compatibility → ats_analyst)
→ server-owned agent selection
→ deterministic analysis (calculate_ats_compatibility)
→ optional controlled LLM draft (generate_ats_compatibility_explanation)
→ human review
→ proposal/export only
```

## Responsibilities

- Compare resume and job snapshot.
- Identify present and missing keywords.
- Distinguish required, preferred, and contextual requirements.
- Detect parsing problems and verify ATS-safe headings/structure.
- Compute a deterministic compatibility score and explain it.
- Produce suggestions without keyword stuffing.

## Allowed inputs (`context.analysisInput`)

- `resumeSnapshot`
- `jobSnapshot` — `title`, `requiredRequirements[]`, `preferredRequirements?`, `keywords?`, `roleSummary?`
- `targetRole`

## Output (minimum)

```ts
{
  compatibilityScore: number;    // deterministic 0..100
  matchedKeywords: string[];
  missingKeywords: string[];
  requiredRequirementCoverage: Array<{ requirement: string; status: "covered" | "partial" | "missing"; evidence: string[] }>;
  parsingRisks: string[];
  structureRisks: string[];
  keywordStuffingWarnings: string[];
  recommendations: string[];
  reviewRequired: true;
}
```

## Deterministic score rules

- Bounded 0..100, documented, and reproducible. The LLM never computes or changes it.
- Tokenization drops stopwords; significant tokens require length ≥ 3 (or contain `+`/`#`).
- Per required requirement: overlap ratio ≥ 0.6 → `covered`, ≥ 0.3 → `partial`, else `missing`.
- Weighting: required coverage **70%**, keyword match **20%**, structure presence **10%**.
  Required requirements carry the highest weight.
- A requirement is never `covered` without token evidence.
- Excessive frequency (a keyword appearing more than 6 times) is **not** counted as added coverage
  and instead raises a keyword-stuffing warning.

## LLM role

The optional LLM only explains the already-computed analysis for human review. It never recomputes
or changes the score and never recommends keyword stuffing.

## Non-goals

- No score computed by the LLM.
- No keyword stuffing rewarded.
- No auto-apply, mutation, persistence, or background work.

## Risks

- Only add missing keywords that reflect genuine experience.
- Address uncovered required requirements with real evidence.

## Example

Request (chat): action `analyze_ats_compatibility`, with `resumeSnapshot` and `jobSnapshot`.
Response: deterministic `atsAnalysis`, a non-executable `career.prepare_ats_review` proposal,
client-safe flags as above.
