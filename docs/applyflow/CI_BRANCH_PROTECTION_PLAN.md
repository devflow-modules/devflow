# ApplyFlow — main branch protection change plan

**Status:** `MAIN_BRANCH_PROTECTION_CHANGE_PLAN` (read-only inspection + proposal)  
**Not applied.** Administrative authorization is required before changing GitHub settings.

## Current state (inspected)

| Item | Observation |
|---|---|
| Classic branch protection `main` | API returned **404 / Branch not protected** |
| Repository rulesets | Empty list (`[]`) at inspection time |
| Classification | `REQUIRED_CHECK_NOT_ENFORCED` |
| ApplyFlow persistence gates | Implemented as **steps inside** GitHub Actions job `test-applyflow` (workflow `CI`) |
| Published check context | Job name / check-run name: **`test-applyflow`** |
| Sibling jobs commonly present on PRs | `lint`, `quality`, `build`, `test`, `test-whatsapp`, `test-financeiro`, `boundary`, plus PR-only `routing-governance` when applicable |

F3.5 and scopes-default are **not** separate required check contexts. Requiring `test-applyflow` covers those steps whenever the job runs them.

## Proposed minimal policy for `main`

Apply **only** after explicit admin authorization (PR merge of helper hardening may land first).

1. Require a pull request before merging to `main` (no direct pushes), when the plan supports it.
2. Require status checks to pass before merge:
   - `test-applyflow` (**required** for ApplyFlow persistence gates)
   - Keep other existing critical jobs required if already part of team policy (`lint`, `quality`, `build`, `test`, and product jobs as applicable).
3. Do **not** require PR-only workflows on `push` events (e.g. `routing-governance` if it does not run on every merge path).
4. Do **not** attempt to require individual step names (`ApplyFlow F3.5…`) — GitHub publishes the job context, not step contexts.
5. Disallow force pushes to `main`.
6. Avoid broad admin bypass; document any emergency bypass owners outside this file.
7. Paths filters: confirm `test-applyflow` still runs for ApplyFlow / Prisma / workflow changes (current CI wiring). Do not add filters that skip persistence gates on those paths.

### Exact contexts to prefer

| Context | Required? | Reason |
|---|---|---|
| `test-applyflow` | **Yes** | Hosts F3.5 + scopes-default + ApplyFlow Vitest/E2E |
| `lint` / `quality` / `build` / `test` | Recommended if already expected by the org | Monorepo baseline |
| Product jobs (`test-whatsapp`, `test-financeiro`) | Per existing org policy | Sibling isolation |
| `routing-governance` | Only if always present on the merge event | Avoid false blockers |

## Impact

- Merges to `main` cannot complete while `test-applyflow` is failing or pending.
- Incomplete F3.5/scopes runs fail the job via the strict JSON helper, then block merge once the job is required.
- Docs-only PRs that still trigger `test-applyflow` will wait on that job (acceptable for persistence safety; revisit only with explicit filter design).

## Validation after admin apply

1. Open a throwaway draft PR that touches ApplyFlow CI paths.
2. Confirm check-run name is exactly `test-applyflow`.
3. Confirm merge is blocked while the check is pending/red.
4. Confirm merge is allowed only when required checks are green (still subject to review rules).

## Rollback

Remove `test-applyflow` from the required list (or disable the ruleset rule) via the same admin UI/API used to apply it. No application deploy rollback is involved.

## Out of scope

- Changing Production rollout / allowlist
- Promoting `main` → `production`
- Publishing the browser extension
