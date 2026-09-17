# ApplyFlow V2 — Career Operating System (P0 + P1 + P2)

**Status:** P0 + P1 + P2 implemented. Pre-dogfooding hardening complete — **FEATURE FREEZE**.
**Date:** 2026-09-09
**Does not replace:** local-first MVP, `calculateFitScore`, V1 job match, V1 Application Pack, or persisted application JSON.

## Philosophy (unchanged)

- Local-first and privacy-first.
- No required ApplyFlow backend, login, or remote database.
- No auto-submit, mass apply, or CAPTCHA bypass.
- AI remains opt-in. Deterministic rules work with AI off.
- Person-specific seeds stay out of domain rules (same split as `gustavoProfile`).

## What P0 adds

A second, explicit decision layer on top of the existing copiloto:

| Layer | Module | Role |
|-------|--------|------|
| Evidence | `evidence-types.ts`, `evidence-schema.ts`, `evidence-from-profile.ts` | Provable facts. Seed extras live in `evidence-seed.ts`. |
| Requirements | `extract-job-requirements.ts` | Structured needs. `3+ years architecting AWS` keeps AWS + years + architecture. |
| Matching | `evidence-matching.ts` | `proven` / `partial` / `gap` / `unknown`. Prefers UNKNOWN over invented GAP or PROVEN. |
| Claims | `claim-safety.ts` | `safe` / `defensible` / `remove`. REMOVE is never a recommendation. |
| Fit V2 | `evaluateJobDecisionV2()` | Multidimensional scores. Overall is importance-weighted, not a naïve dimension average. |
| Decision | same | Separates FIT, HIRING PROBABILITY, CAREER UPSIDE, OPPORTUNITY COST, RISK, PRIORITY. |
| Gates | `application-gates.ts` | Location, authorization, salary, seniority, years, English, mandatory skill, binary knockout. A required fail can downgrade APPLY → SKIP. |
| Input | `candidate-input.ts` | Asks the candidate when a requirement is UNKNOWN and answerable. |
| Pipeline | `pipeline-status.ts` | Conceptual V2 statuses + adapters. Persisted JSON stays on V1 `status`. |

## Scoring

Importance weights (explicable, versioned with `scoringVersion: "v2"`):

- fundamental = 5
- important = 3
- nice_to_have = 1

Match points used in weighted coverage:

- proven = 100
- partial = 52
- gap = 8
- unknown = excluded from the average (does not invent a gap score)

Dimensions returned separately: `overall`, `coreEngineering`, `stack`, `specialization`, `seniority`, `product`, optional `cloud` / `ai` / `language`.

A candidate can be Core 92 / Product 95 / Stack 89 / AWS 25 / AI 30. Those stay visible. Overall is not their mean.

## Decisions

`apply_high` | `apply_normal` | `apply_stretch` | `skip`

Valid combinations:

- Fit 75 + risk high + upside very high → `APPLY_STRETCH`
- Fit 55 + risk high + upside medium → `SKIP`
- Required gate fail → `SKIP` (never auto-submit)

## Pipeline adapters

V1 persisted statuses are unchanged (`reviewing`, `applied`, `ignored`, …).

V2 conceptual statuses: `found`, `qualified`, `skipped`, `applying`, `applied`, `recruiter_contacted`, `screening`, `technical`, `final`, `offer`, `rejected`, `withdrawn`.

Import accepts either spelling and stores V1. Mapping is lossy and documented in `pipeline-status.ts`.

## Compatibility

- `calculateFitScore` / `evaluateJobMatch` remain the V1 path for inbox, packs, and Interview Lab.
- Extension, dashboard import, and old JSON keep working.
- V2 is additive. No new backend.

## P1 — Application Copilot & Networking

P1 turns `APPLY` / `APPLY_STRETCH` into an executable, evidence-safe application pack. It does **not** auto-submit, mass-apply, scrape recruiters, or message LinkedIn.

### Evidence → Claim Audit → Final Output

```
Evidence[]  →  claim text
            →  Claim Audit (safe | defensible | remove)
            →  Final Output (REMOVE stripped)
```

No `REMOVE` claim may appear in headlines, CV plan, answers, networking drafts, or interview brief text shown to the user.

### Job Decision → Application Pack → Networking → Interview

```
Job + Profile + Evidence
  → evaluateJobDecisionV2()
  → createApplicationPackV2()
       ├ resume router V2
       ├ CV personalization plan
       ├ application answers
       ├ binary / knockout questions
       ├ compensation structure
       ├ networking plan
       ├ follow-up plan + due queue
       └ interview brief / case match
  → local contacts + interactions
  → Interview Lab still consumes CareerBundle 1.0
```

`ApplicationPackV2` is regenerable. If `decision == skip` (including a mandatory binary knockout), the pack is `{ status: "blocked" }` and is never presented as a recommended application.

### Local bundle V2

`ApplyFlowCareerBundleV2` (`version: 2`) can carry profile, evidence, jobs, applications (optional `v2` metadata envelope), contacts, interactions, and candidate inputs. V1 application JSON still imports. Unknown top-level fields are kept in `extras` (no silent drop). Interview Lab handshake remains CareerBundle `schemaVersion: "1.0"`; an optional `applyflow-v2-sidecar` sibling is ignored by V1 parsers.

## P2 — Career Analytics + Learning

Deterministic, local-only analytics. Persist raw outcomes/events/effort; derive metrics on read.

```
RAW DATA → METRICS → OBSERVED PATTERNS → INSIGHTS → HUMAN DECISION
```

Analytics identifies observed associations and patterns; it does not establish causality.

Functions: `computeFunnelMetrics`, fit/role/source/resume/networking/gap/evidence/case/priority/effort, `buildCareerScorecard`, `generateCareerInsights`, `computeGapMap`.

UI: `/dashboard/analytics`. Manual outcome logging on `/dashboard/jobs/[id]` requires a real Application record (`applicationId`). Job id is not Outcome identity.

At Application creation the product persists an immutable decision snapshot (scores, requirement statuses, resume variant, evidence/case IDs). Analytics uses that snapshot so later CandidateProfile / Evidence Bank edits do not rewrite history. Packs and generated copy stay regenerable and are not stored.

Not included: ML, RAG, embeddings, agents, causal inference, cloud sync, auth, billing, AI gateway, auto apply.

See [`ANALYTICS_MODEL.md`](./ANALYTICS_MODEL.md).
