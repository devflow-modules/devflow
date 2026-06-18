# Career strategy agent (`career_strategy_advisor`)

Deterministic career strategy planning inside the existing multi-agent boundary. Routed only from
the `plan_career_strategy` intent. No new orchestrator, endpoint, provider, LLM layer, tool
boundary, automation, persistence, memory, or background job is introduced.

## Flow

```txt
client-safe request
→ deterministic intent resolution (plan_career_strategy → career_strategy_advisor)
→ server-owned agent selection
→ deterministic analysis (build_career_strategy_plan)
→ optional controlled LLM draft (generate_career_strategy_explanation)
→ human review
→ proposal/export only
```

## Responsibilities

- Analyze profile, applications, gaps, and goals.
- Suggest short-term focus and study priorities.
- Recommend portfolio projects and the most adherent role types.
- Suggest professional positioning.
- Generate a 30/60/90-day plan and indicate risks and dependencies.

## Allowed inputs

- `careerBundle` (existing sanitized context)
- `context.analysisInput`: `targetRoles[]`, `availability`, `constraints[]`
- selected provider signals (`applicationSignals` / `profileGapSignals`) when present

## Output (minimum)

```ts
{
  positioningSummary: string;
  priorityRoles: Array<{ role: string; rationale: string; readiness: "ready" | "near_ready" | "longer_term" }>;
  skillPriorities: Array<{ skill: string; priority: "high" | "medium" | "low"; reason: string; evidence: string[] }>;
  portfolioPriorities: string[];
  applicationStrategy: string[];
  thirtyDayPlan: string[];
  sixtyDayPlan: string[];
  ninetyDayPlan: string[];
  risks: string[];
  reviewRequired: true;
}
```

## Deterministic rules

- Focus is limited to at most **three** primary fronts (`priorityRoles` and `skillPriorities`).
- Readiness per role is derived from skill coverage: ≥ 0.75 → `ready`, ≥ 0.4 → `near_ready`, else `longer_term`.
- Skill priorities come from required skills (across tracked applications) not yet evidenced in the main stack.
- Availability and constraints are respected in the plan and risks.
- A standing risk states the plan is advisory only and does not guarantee interviews or hiring.

## LLM role

The optional LLM only explains/organizes the deterministic plan for human review. It never
promises hiring, recommends auto-apply, or invents experience.

## Non-goals

- No hiring promise.
- No automatic application recommendation / auto-apply.
- No unrealistic timeline, no invented experience.
- No mutation, persistence, or background work.

## Risks

- Plans assume the stated availability; adjust scope if it changes.
- Low coverage means the timeline depends on consistent study.

## Example

Request (chat): action `plan_career_strategy`, with `targetRoles` and `availability`. Response:
deterministic `careerStrategyPlan` (≤ 3 fronts), a non-executable `career.prepare_strategy_review`
proposal, client-safe flags.
