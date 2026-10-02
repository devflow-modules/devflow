# ApplyFlow — beta evidence template

**Do not fabricate metrics.** Leave fields blank until measured.

**No Cohort 1 invite metrics yet** (Phase 12C production release only).

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
| Two-account Production tenant probe | **DEFERRED** — no Account B credentials in session; covered by V2 E2E |

### Rollback

| Field | Value |
|-------|-------|
| Rollback target | `d9e88981` (prior Production deployment) |
| Required | NO |

---

## Meta (Cohort 1 — blank until Phase 13)

| Field | Value |
|-------|-------|
| Beta baseline SHA | `18cf6620` |
| Period (UTC) | |
| Operator | |
| Environment | Production `devflow-applyflow` |

---

## Cohort

| Field | Value |
|-------|-------|
| Invited users | |
| Activated V2 pilots | |
| Active users (definition: ) | |

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
| Cross-tenant issues | none observed; Production dual-account deferred |
| Provider cost anomalies | none (TheirStack OFF; no paid search in smoke) |

---

## Qualitative

| Field | Notes |
|-------|-------|
| User friction themes | |
| Validated value | |
| Rejected assumptions | |
| Next product decisions | Phase 13 cohort invites after dual-account Production smoke if desired |

---

## Decision

| Option | Chosen? |
|--------|---------|
| Continue closed beta | pending Phase 13 |
| Pause invites | **YES** until cohort checklist |
| Iterate product | |
| Block public signup (expected until separate audit) | **YES** |
