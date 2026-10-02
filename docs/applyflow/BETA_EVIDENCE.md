# ApplyFlow — beta evidence template

**Do not fabricate metrics.** Leave fields blank until measured.

**No Cohort 1 invite metrics yet** (Phase 13 opened; wave-1 invites not yet executed).

---

## Phase 13 — Cohort 1 kickoff (operator)

| Field | Value |
|-------|-------|
| Opened (UTC) | 2026-10-02 |
| Production SHA (frozen) | `18cf6620` |
| Repository `main` | `569255f3` pushed to `origin/main` (docs only; **not** promoted to Production) |
| Wave 1 target | 5 real users (expand toward 10 only if P0=0 / no systemic P1) |
| Real Cohort invites | **0** |
| Activated Cohort users | **0** |
| Operator smoke accounts | 2 pilots + 1 non-cohort row (not Cohort evidence) |
| Invite log | [`COHORT1_OPERATOR_LOG.md`](./COHORT1_OPERATOR_LOG.md) |
| Feature development | none (observe first) |
| TheirStack | SHARED OFF |
| Decision | invites **authorized**; evidence collection **not started** |

---

## Phase 12D — dual-account Production tenant isolation smoke

| Field | Value |
|-------|-------|
| Date (UTC) | 2026-10-02 |
| Production SHA | `18cf6620` |
| Repository | `main` @ `3413caba` (docs evidence commit follows) |
| Two-account smoke | **PASS** |
| Non-pilot gate | **PASS** — authenticated Account B received `403 persistence_v2_not_eligible` on V2 Jobs/Applications before grant |
| Cross-tenant Job read | **404** `not_found` — no Account A fields |
| Cross-tenant Application read | **404** `not_found` — no Account A fields |
| Cross-tenant Job mutation | **404** `not_found` — mutation did not succeed |
| Cross-tenant Application mutation | **404** `not_found` — mutation did not succeed |
| Account A integrity after denials | **PASS** — applied Job/Application + Northstar reviewing unchanged |
| Session isolation | **PASS** — Account B lists empty; no stale A company/role/ids |
| Unexpected Production errors | none observed in operator log sample |
| Sentry | Production DSN set; privacy posture unchanged from Phase 12B |
| TheirStack | SHARED OFF / not configured on Production (`provider_not_configured`) |
| Backup retained | YES — pre-deploy dump + checksum still present locally |
| `beta:check --strict` | WARN tooling/operator evidence mismatch (local env ≠ Production Sensitive) — P3 |
| Deployments this phase | NONE |
| Migrations this phase | NONE |
| Pilot accounts | keep two dedicated operator smoke accounts (A + B) |
| Cohort invites | **NOT started** |

---

## Phase 12C — controlled Production release

| Field | Value |
|-------|-------|
| Release date (UTC) | 2026-10-02 |
| Production SHA | `18cf6620` |
| Previous Production SHA | `d9e88981` |
| Vercel project | `devflow-applyflow` |
| Production domain | https://devflow-applyflow.vercel.app |
| Promotion | fast-forward `production` → `18cf6620` (no force-push) |
| Pre-deploy backup | YES — `pg_dump --format=custom` (outside git) |
| Backup validation | `pg_restore -l` PASS; SHA-256 recorded |
| Backup size | 299388 bytes |
| TheirStack shared | OFF (flag absent) |
| Sentry DSN Production | SET (`APPLYFLOW_SENTRY_DSN`) |
| Migrations this release | NONE |
| Cohort invites | **NOT started** (Phase 13) |

### Monorepo isolation (this release push)

| Project | Result |
|---------|--------|
| `devflow-applyflow` | Production READY @ `18cf6620` |
| `devflow-whatsapp` | Production deploy for `18cf6620` **CANCELED** by ignore |
| `devflow-financeiro` | No new deploy |
| `devflow` portal | No Production promotion observed |

### Smoke (operator)

| Surface | Result |
|---------|--------|
| Public Home | PASS — current IA; Salvar ≠ candidatar; no Easy Apply hero |
| Login | PASS — auth surface loads |
| Dashboard / Discover / Opportunities / Applications / Analytics / Account | HTTP 200; no crash shell |
| Discovery UI | PASS — providers + manual paste; TheirStack option present but shared OFF |
| Cloud persistence banner | Observed on authenticated/cloud session in operator browser |
| Two-account Production tenant probe | **PASS** — see Phase 12D |

### Rollback

| Field | Value |
|-------|-------|
| Rollback target | `d9e88981` (prior Production deployment) |
| Required | NO |

---

## Meta (Cohort 1)

| Field | Value |
|-------|-------|
| Beta baseline SHA | `18cf6620` |
| Period (UTC) | opened 2026-10-02 — **in progress** |
| Operator | |
| Environment | Production `devflow-applyflow` |

---

## Cohort

| Field | Value |
|-------|-------|
| Invited users | 0 |
| Activated V2 pilots | 0 (cohort); 2 operator smoke only |
| Active users (definition: completed ≥1 meaningful action) | 0 |

---

## Product outcomes (only if observable)

| Field | Value |
|-------|-------|
| Jobs saved | |
| Applications registered | |
| Applications marked sent | |
| Notable lifecycle transitions | |

---

## Reliability / security

| Field | Value |
|-------|-------|
| Incidents | |
| P0 count | 0 (this release) |
| P1 count | 0 systemic (this release) |
| Cross-tenant issues | none — Production dual-account smoke PASS (Phase 12D) |
| Provider cost anomalies | none (TheirStack OFF; no paid search in smoke) |

---

## Qualitative

| Field | Notes |
|-------|-------|
| User friction themes | |
| Validated value | |
| Rejected assumptions | |
| Next product decisions | Phase 13 cohort invites may proceed under closed-beta controls |

---

## Decision

| Option | Chosen? |
|--------|---------|
| Continue closed beta | **YES** — dual-account gate PASS |
| Pause invites | **NO** — Cohort 1 wave 1 authorized; execute via operator log |
| Iterate product | **NO** until observed friction (default) |
| Block public signup (expected until separate audit) | **YES** |
