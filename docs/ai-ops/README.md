# AI-OPS

## What AI-OPS Is

**AI-OPS** is the standardized operating model for AI-assisted engineering across the DevFlow monorepo. It defines how planning, implementation, review, and acceptance interact so that work remains consistent, auditable, and safe for production SaaS products.

## Why It Exists

- **Consistency:** Multiple products (Next.js apps, RPA, APIs, packages) share one way of working with AI tools.
- **Risk control:** Clear separation between ideation (ChatGPT) and execution (Cursor) reduces blind refactors and architectural drift.
- **Quality bar:** Linked documents (workflow, acceptance criteria, definition of done) make “done” objective, not subjective.
- **Onboarding:** New engineers and AI sessions start from the same playbook.

## How It Integrates with DevFlow

| Layer | Role |
|--------|------|
| **Repository** | Source of truth: Turborepo, PNPM, shared packages, app-specific boundaries. |
| **AI-OPS** | Process layer: when to plan, how to prompt, how to validate, when a task is complete. |
| **Product teams** | Apply AI-OPS per feature; extend only where product rules differ (document deltas in PRs). |

AI-OPS does not replace product specs, security review, or release management. It structures *how* AI tools participate in delivery.

## High-Level Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  ChatGPT    │     │   Cursor    │     │  ChatGPT    │
│  Planning   │────▶│  Execution  │────▶│ Validation  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │
       │                    │                    │
       ▼                    ▼                    ▼
  Intent, scope,      Code & tests        Review vs
  constraints,        in-repo             acceptance
  prompts ready                             criteria
```

1. **ChatGPT (planning):** Clarify requirements, surface risks, produce structured prompts and acceptance notes.
2. **Cursor (execution):** Implement against the repo; follow `CURSOR_RULES.md` and product conventions.
3. **ChatGPT (validation):** Compare implementation intent to `ACCEPTANCE_CRITERIA.md` and `DEFINITION_OF_DONE.md`; flag gaps before merge.

Iteration loops between Cursor and validation until the task meets the definition of done.

## Document Map

| File | Purpose |
|------|---------|
| [AI_WORKFLOW.md](./AI_WORKFLOW.md) | Official step-by-step workflow and anti-patterns. |
| [CURSOR_RULES.md](./CURSOR_RULES.md) | Execution rules for Cursor and code quality expectations. |
| [PROMPT_TEMPLATE.md](./PROMPT_TEMPLATE.md) | Reusable prompts for feature, bugfix, refactor, infra. |
| [ACCEPTANCE_CRITERIA.md](./ACCEPTANCE_CRITERIA.md) | Standard acceptance model by domain. |
| [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md) | Objective completion checklist. |

---

*AI-OPS is maintained as part of DevFlow engineering standards. Propose changes via PR with rationale.*
