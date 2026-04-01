# Definition of Done

Objective criteria for completing a task in DevFlow. A task is **not done** until all applicable items are satisfied. Waivers require named approver and ticket reference.

---

## 1. Build

- [ ] **Monorepo build** succeeds for affected packages (`pnpm build` at root or scoped Turbo build as per CI).
- [ ] **Typecheck** passes where enforced (no new TS errors in touched files).
- [ ] **Generated artifacts** (e.g. Prisma client) updated if schema or generators changed.

---

## 2. Lint

- [ ] **ESLint** passes for touched files (`pnpm lint` or app-scoped equivalent).
- [ ] No new **suppressed rules** without comment and justification.

---

## 3. Tests

- [ ] **Existing tests** relevant to the change pass.
- [ ] **New or updated tests** added when behavior changed or regression risk is non-trivial (per ACCEPTANCE_CRITERIA risk table).
- [ ] **Flaky tests** not introduced; if unavoidable, documented with follow-up ticket.

*If tests are explicitly out of scope, document reason and get approval.*

---

## 4. Edge Cases & Contracts

- [ ] **Acceptance criteria** from the task (and `ACCEPTANCE_CRITERIA.md` cross-cutting) addressed or explicitly deferred with ticket.
- [ ] **API / event contracts** unchanged or versioned; consumers updated if breaking.
- [ ] **Migrations** reversible or rollback documented for data changes.

---

## 5. Runtime Hygiene

- [ ] **No stray `console.log`** in production paths (use project logger or remove).
- [ ] **No console errors** in happy-path manual verification for UI changes.
- [ ] **Feature flags** default safe; documented if new.

---

## 6. Architecture & Security

- [ ] **Architecture** respected: boundaries, patterns, no unauthorized new layers (per CURSOR_RULES).
- [ ] **Secrets** not in code or logs; new env vars documented in README or ops runbook.
- [ ] **Authz / tenancy** verified for multi-tenant and admin paths touched.

---

## 7. Documentation & Handoff

- [ ] **PR description** states what changed, why, and how to verify.
- [ ] **User-visible behavior** updated in docs or changelog if customers are affected.
- [ ] **Operational notes** added if deploy order, cron, or secrets change.

---

## 8. Merge Readiness

- [ ] **CI green** (or equivalent local parity if CI not yet on branch).
- [ ] **Review**: at least one peer review for non-trivial changes; AI validation pass per AI_WORKFLOW Step 3 when AI-driven.

---

## Checklist (Quick Copy)

```markdown
## DoD — {{TASK_ID_OR_TITLE}}

- [ ] Build / typecheck
- [ ] Lint
- [ ] Tests (scope: ___)
- [ ] Acceptance criteria met
- [ ] No secrets / authz verified
- [ ] Logs/observability OK
- [ ] PR description + verify steps
- [ ] Ready for merge
```

---

## When “Done” Is Blocked

| Situation | Action |
|-----------|--------|
| Dependency on another team | Split task; merge behind flag or hold |
| Production verification needed | Deploy to staging first; DoD includes staging sign-off |
| Known follow-up | Create ticket; link in PR; merge only if tech-debt is acceptable |

---

*Definition of Done applies per task. Epics complete when all constituent tasks meet DoD.*
