# ApplyFlow — testing & CI

Latest cited baseline: commit **`f599ea03`** (UI/design-system consolidation on top of closed-beta ops).

Earlier closed-beta ops baseline: `5636feef`. Re-validate after material code changes; do not treat counts as eternally current without a date/SHA.

---

## Layers

| Layer | Command | What it proves |
|-------|---------|----------------|
| Core Vitest | `pnpm --filter @devflow/applyflow-core test` | Match, lifecycle, readiness domain |
| ApplyFlow Vitest | `pnpm --filter applyflow test` | API, persistence, UI unit/integration |
| Local Playwright E2E | `pnpm --filter applyflow test:e2e` | Local-first critical funnel + TheirStack off |
| V2 Playwright E2E | `pnpm --filter applyflow test:e2e:v2` | Cloud persistence, tenant isolation, pilot gate |
| Backup drill | `pnpm --filter applyflow backup:drill` | Local dump/restore mechanics |
| Closed-beta check | `pnpm --filter applyflow beta:check` | Env policy presence (no secret values printed) |

---

## Baseline (f599ea03)

| Suite | Result |
|-------|--------|
| `@devflow/applyflow-core` | **475 passed** |
| ApplyFlow Vitest | **1419 passed** / 30 skipped |
| Local E2E | **2 passed** |
| V2 E2E | **2 passed** |
| Typecheck | PASS |
| Lint | PASS |
| Production build | PASS |

Prior Phase 9D snapshot (`5636feef`) also recorded backup drill **PASS** and ApplyFlow Vitest **1415** passed — prefer the newer SHA above when quoting portfolio evidence.

---

## Local E2E vs V2 E2E

### Local-first (`playwright.config.cjs`)

- Persistence V2 off for the webServer env
- Provider fixtures; TheirStack forced off
- Cookie E2E session
- Critical funnel: login → discovery → save → queue → readiness → register → mark sent → lifecycle → reload → TheirStack reject → logout

### V2 cloud (`playwright.v2.config.cjs`)

- Isolated Docker Postgres (`127.0.0.1:5434`) — never inherits remote `.env.local` DB
- `APPLYFLOW_PERSISTENCE_V2=true` + seeded pilot/`v2_cloud` accounts
- Account A: cloud save/reload/lifecycle with V1 job cache cleared before reload
- Account B: cannot list/read/mutate A’s Jobs/Applications
- Non-pilot: cannot use V2 product surfaces
- TheirStack remains `provider_not_available`

Both suites refuse non-local base URLs.

---

## CI (`.github/workflows/ci.yml` — `test-applyflow`)

Ephemeral Postgres service → migrate → generate → lint → Vitest (includes `src/lib/ci/assert-vitest-json-passed.test.ts`) → **F3.5 mutable E2E** (`APPLYFLOW_F3_5_E2E=1`, min 17 passed, **strict** JSON gate) → **scopes-default harness** (disposable Docker Postgres `:5439`, min 3 passed, **strict**) → Playwright Chromium → local E2E → V2 E2E (`v2-cloud-*.spec.ts`) → `beta:check`.

Strict Vitest JSON gate (`scripts/ci/assert-vitest-json-passed.cjs`):

- Requires Vitest v4 JSON fields (`numPassedTests`, `numFailedTests`, `numPendingTests`, `numTodoTests`, `numTotalTests`).
- Fails on missing/invalid JSON, zero tests, failures, `success=false`, inconsistent totals, and (by default) any pending/todo/skipped.
- Opt-out only via `--allow-incomplete` (not used by F3.5 / scopes-default).

Also: workspace secret scan job (`pnpm check:secrets`) elsewhere in CI.

**Branch protection:** see [`CI_BRANCH_PROTECTION_PLAN.md`](./CI_BRANCH_PROTECTION_PLAN.md). Applying required checks is an admin action and is **not** claimed as done by the CI YAML alone.

---

## Provider network in tests

E2E uses fixtures. Live Jobgether / Remote OK / TheirStack / OpenAI must stay at **zero** calls in those suites.
