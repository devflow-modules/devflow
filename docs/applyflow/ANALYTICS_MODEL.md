# ApplyFlow Analytics Model (P2)

Analytics identifies observed associations and patterns; it does not establish causality.

```
RAW DATA
  ↓
METRICS
  ↓
OBSERVED PATTERNS
  ↓
INSIGHTS
  ↓
HUMAN DECISION
```

## Raw data (persisted)

- Applications / jobs (V1 JSON)
- `ApplicationOutcome` timestamps and optional explicit rejection reason
- `ApplicationCareerEvent` (manual feedback)
- `ApplicationEffort` minutes (optional)
- Contacts / interactions
- Historical `JobDecisionV2` matches from the immutable `ApplicationOutcome.snapshot` captured when the Application was created (fit, dimensions, decision, priority, requirement statuses, `resumeVariant`, `supportingEvidenceIds`, `primaryCaseIds`). Live re-evaluation of the current profile/evidence bank is not used for historical analytics.
- Evidence Usage and Case Usage read those historical IDs. The regenerable `ApplicationPackV2` and generated texts are not persisted.

Derived funnel rates, scorecards and insights are **not** persisted by default. They are recalculated by pure functions in `@devflow/applyflow-core`.

## Observation vs causality

Correct: "Applications with networking had a higher observed reply rate in the current dataset."

Incorrect: "Networking increases your chances."

Every networking cohort includes: `Observed association, not causal attribution.`

## Rejection reasons

A GAP in evidence matching is **not** a rejection reason.

If the candidate records a rejection without an explicit reason, category and source stay `unknown`.

## Sample size

- n < 5 → low confidence
- 5–14 → medium
- 15+ → high
- Cohort comparisons use the smaller n

No statistical significance testing in this phase.

## UNKNOWN ≠ GAP

`unknown` evidence matches increment `unknownCount` only. They never increment `gapCount`.

## Local-first

`localStorage` key `APPLYFLOW_DASHBOARD_ANALYTICS_V1`. No backend, login, or cloud sync.

Outcome identity is `applicationId`. A Job is not an Application. `v2.sourceJobId` is only a link back to the inbox job.
