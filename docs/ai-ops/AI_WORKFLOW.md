# AI Workflow (Official)

## Overview

This workflow assigns **clear ownership** to each tool:

| Tool | Primary responsibility |
|------|-------------------------|
| **ChatGPT** | Planning, structuring work, reviewing outcomes against criteria. |
| **Cursor** | Reading the codebase, implementing, testing locally, minimal scope edits. |

No tool replaces human judgment on merges, security, or production incidents.

---

## Step 1: Planning (ChatGPT)

**Goal:** Produce a bounded task with explicit inputs, outputs, constraints, and validation hooks.

### Rules

- Start from a **single objective** (one feature slice, one bug, one refactor unit).
- Identify **affected apps/packages** and **entry points** (routes, jobs, CLI).
- List **non-goals** explicitly.
- Reference **existing patterns** in the repo (file paths, naming) when known; mark unknowns for Cursor discovery.
- Output a prompt usable in **PROMPT_TEMPLATE.md** shape: task, context, requirements, constraints, output format.

### Responsibilities

- Decompose large work into **sequential, mergeable** steps.
- Call out **contract changes** (APIs, env vars, DB migrations) so they are intentional.
- Define **acceptance criteria** at the right abstraction (link or mirror `ACCEPTANCE_CRITERIA.md`).

### Anti-patterns

- Vague goals (“improve performance everywhere”).
- Planning **new architecture** without repo inspection (hallucinated modules).
- Skipping **rollback / feature-flag** discussion for risky changes.
- Mixing multiple unrelated features in one execution batch.

---

## Step 2: Execution (Cursor)

**Goal:** Implement the plan **inside the monorepo** with minimal diff and maximal alignment to existing code.

### Rules

- Follow **CURSOR_RULES.md** strictly.
- Implement **only** what the planning step defined; if scope must change, **stop** and re-plan.
- Prefer **edits to existing files** over new files unless the plan requires new surfaces.
- Run **build / lint / tests** relevant to touched packages before considering work complete.
- Commit messages describe **what and why**, not raw chat dumps.

### Responsibilities

- Respect **boundaries**: `apps/*` vs `packages/*`, env-specific code, schema ownership.
- Match **types, Zod schemas, API response shapes** already in use.
- Add or update **tests** when behavior changes or risk warrants it.

### Anti-patterns

- Drive-by refactors unrelated to the task.
- Adding dependencies without product need or lockfile discipline.
- Copy-pasting large blocks without adapting to local conventions.
- “Finishing” without running targeted checks.

---

## Step 3: Validation (ChatGPT)

**Goal:** Independent pass against **acceptance criteria** and **definition of done** before merge.

### Rules

- Use the **validation prompt template** in `PROMPT_TEMPLATE.md`.
- Compare **stated requirements** vs **actual diff** (files, behavior), not generic praise.
- Flag **missing tests**, **unhandled errors**, **observability gaps**, **security** (secrets, authz).
- Produce a **short list**: pass / fail / needs follow-up with file references.

### Responsibilities

- Verify **edge cases** listed in planning still make sense post-implementation.
- Check **contract stability** for consumers (callers, mobile, RPA selectors if applicable).

### Anti-patterns

- Approving without reading the diff or criteria.
- Treating “build passed locally once” as sufficient for high-risk changes without test strategy.

---

## Step 4: Iteration Loop

**When:** Validation fails partially or new issues appear in review.

### Cycle

1. ChatGPT (or human) turns failures into **specific, minimal** follow-up tasks.
2. Cursor implements fixes; avoid scope creep.
3. Re-run validation until **DEFINITION_OF_DONE.md** is satisfied.

### Exit conditions

- All checklist items in `DEFINITION_OF_DONE.md` are true for the task scope.
- No open **severity-1** gaps (security, data loss, authz) from validation.

### Anti-patterns

- Infinite polish without merge (time-box; split follow-ups).
- Fixing validation findings by **widening scope** without re-planning.

---

## Summary Table

| Step | Owner | Output |
|------|--------|--------|
| 1 | ChatGPT | Scoped plan + prompt + acceptance notes |
| 2 | Cursor | Code + tests + local verification |
| 3 | ChatGPT | Validation report vs criteria |
| 4 | Both | Targeted fixes until DoD |

---

*This workflow is mandatory for AI-assisted work that touches production paths. Exceptions require documented rationale in the PR.*
