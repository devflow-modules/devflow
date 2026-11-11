# ApplyFlow Persistence V2 — QA Production Pilot (release consolidation)

**Status:** `V2_QA_PRODUCTION_PILOT_ACTIVE_PARTIAL` (functional gates closed; documentary/ops gaps remain)  
**Milestone target:** `APPLYFLOW_V2_RELEASE_CONSOLIDATION_READY`  
**Audience:** engineering + release operators  
**Sanitization:** no QA email, full account UUID, tokens, cookies, or connection strings

---

## 1. Problem & objective

Ship cloud persistence (V2) behind a fail-closed rollout so a single invited account can migrate from local-first V1, keep data in cloud, and reconnect the browser extension — without opening the fleet.

This document consolidates **already executed** Production QA-only pilot evidence and the consolidation engineering gates (CI F3.5, scopes-default, Playwright modes, extension packaging). It does **not** authorize allowlist expansion.

---

## 2. Architecture (relevant)

- Modes: `v1` → `v2_offering` → `v2_active` / `v2_cloud` (plus paused / read-only paths).
- Flag: `APPLYFLOW_PERSISTENCE_V2`.
- Allowlist: `APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS` (account ids only).
- Extension grant: opaque bearer minted by `/account` → `POST /api/applyflow/v2/extension/session`; SW validates via `GET …/extension/session`.
- Contacts read: internal extension message `APPLYFLOW_LIST_CLOUD_CONTACTS` (options/panel context), not page-external messaging.

---

## 3. SHAs & PRs

| Ref | Value |
|-----|-------|
| `origin/main` (consolidation base) | `2bb084015c552e6ac170b72ffd3d07d6ae9917d3` — extension Production origin (#268) |
| `origin/production` (live deploy lineage) | `6c5a0614815a14e98cdf651b875cbd1452caeaa6` — RC hardening (#267) |
| Production deployment | `dpl_8YWFsgxbr8j6iachuqS2mCPLYRgR` |
| Production URL | `https://devflow-applyflow.vercel.app` |
| PR #267 | MERGED — decision gates, preview fail-closed, CI hardening |
| PR #268 | MERGED — extension canonical Production origin |

`main` is ahead of `production` by the extension origin merge only. Pilot runtime remains on the Production deployment above.

---

## 4. Schema & migrations

Read-only Production attestation (operator report `APPLYFLOW-V2-001`):

- Eight expected ApplyFlow migrations — all `finished`.
- Classification: `NO_PRODUCTION_MIGRATION_REQUIRED` / `PRODUCTION_SCHEMA_READY_VERIFIED`.
- Includes extension grant `scopes` column + legacy default migrations.

---

## 5. Rollout QA-only (Production state — do not mutate here)

| Knob | Intended state |
|------|----------------|
| Flag V2 | ON |
| Allowlist | Exclusive single QA account id |
| QA persistence | `v2_active` / `v2_cloud` |
| Synthetic fixture | Job title `QA-V2-PILOT-20261110` (id prefix `job_mwb6ihh9_…`) |
| Extension | v0.2.1 unpacked; **not** Chrome Web Store published |
| Test grants | Revoked after Gap 6; session logged out |

---

## 6. Capability evidence matrix

Legend: **Env** = `Production` vs `Local/CI disposable`. Do not treat Local as Production proof.

| Capability | Status | Env | Evidence (sanitized) |
|------------|--------|-----|----------------------|
| Schema ready / no Prod migration | PASS | Production (read-only) | AF-V2-001 attestation |
| Flag ON + exclusive allowlist | PASS | Production (ops) | Pilot rollout session |
| Pilot grant / eligibility | PASS | Production | `pilot:grant` ops (restricted log) |
| Empty activate / migrate to V2 | PASS | Production | UI activate + `/me` → `v2_active` |
| Cloud job CRUD (synthetic) | PASS | Production | `GET /jobs` 200, count=1, fixture title match |
| Reload persistence | PASS | Production | Jobs API after reload still count=1 |
| New browser context recovery | PASS | Production | New page `/dashboard` → jobs API count=1 |
| Cross-account isolation | PASS | Local | 7/7 isolation suite (not Production live-negative) |
| F3.5 mutable migration E2E | PASS | Local disposable | 17/17 with `APPLYFLOW_F3_5_E2E=1` (CI gate added in consolidation) |
| Extension handshake Production | PASS | Production + harness | `qa-production-handshake.mjs`; manifest 0.2.1 |
| Extension grant UI (`data-testid`) | PASS | Production | Probe → permissions → link |
| Extension signedIn + 8 scopes | PASS | Production | Gap 5 poll from page/options |
| Extension cloud **read** (contacts) | PASS | Production | Gap 6 via `options.html` → `ok:true`, count=0 |
| Extension revoke → reject read | PASS | Production | Gap 6 after DELETE → `401 signed_out` |
| Extension cloud **write** | NOT_EXECUTED / NOT_IMPLEMENTED as pilot proof | — | Write handlers exist for jobs/apps/contacts; **no** Production write validation in pilot |
| Multi-device realtime sync | NOT_EXECUTED | — | Out of pilot scope |
| Live non-QA negative (Prod) | NOT_EXECUTED | Production | Explicitly deferred |
| Backup dump + TOC list | PASS | Ops offline | See §7 |
| Backup restore to disposable | PARTIAL | Ops offline | Restore ran; `supabase_vault` extension errors ignored (3) |

---

## 7. Backup & recovery (ops artifact — not in git)

| Field | Value |
|-------|-------|
| Timestamp (UTC) | `2026-11-10T20:14:57.876Z` |
| Method | Logical `pg_dump` |
| Project ref (expected) | `qygwhuwvilkekfkgoizb` |
| Host fingerprint | `3c193d95207920e0` |
| Bytes | `358483` |
| SHA-256 | `166b18a41d2ce74e7b42027134afac944dfd65d94e6fb076801476213cfa2613` |
| `pg_restore -l` | status 0; TOC lines 518; ApplyFlow objects 71 |
| Disposable restore | Attempted; vault extension missing on local PG — ApplyFlow tables otherwise restored (ops log) |
| Classification | `BACKUP_VERIFICATION_PARTIAL` (TOC verified; restore not clean-zero due to platform extensions) |

Coverage note: Auth/Storage platform objects may be incomplete on Free plan; no PITR assumed.

---

## 8. Extension v0.2.1

- Manifest version `0.2.1`; canonical Production host in `externally_connectable` / host permissions.
- Unpacked QA id (stable `key`): `mjigahpnpgcopnjfofcpopkaehohfknh` — **not** a Chrome Web Store id.
- Distribution packaging + CWS checklist: see `apps/applyflow-extension/docs/DISTRIBUTION_READY.md`.
- Cloud write: product code paths exist; **pilot validated read + revoke only**.

---

## 9. Residual risks

1. Production live cross-account negative not executed (config exclusivity only).
2. Extension write / multi-device sync unproven in Production.
3. Backup restore not clean on stock Postgres (vault).
4. `main` ≠ `production` SHA (extension origin on main only) — do not promote without explicit cutover.
5. Branch-protection “required check” for new F3.5 step needs admin follow-up.

---

## 10. Expansion criteria (Stage 0 stays QA)

Do **not** widen allowlist until:

1. F3.5 mutable job green on PR CI.
2. Scopes-default harness green.
3. Playwright `v2-cloud-*` modes green.
4. Schema still compatible / no pending Prod migration.
5. Backup/recovery ops playbook accepted.
6. No open critical/high blockers.
7. Onboarding + support recovery docs reviewed.
8. Controlled extension distribution plan (if needed).
9. **Explicit** human authorization to edit allowlist.

Staged plan: Stage 0 QA → Stage 1 invited few → Stage 2 closed beta → Stage 3 broader eval. Each stage needs preconditions, metrics, stop criteria, and disable procedure (see consolidation PR description).

---

## 11. Current Production posture

Leave V2 **ON**, allowlist **QA-only**, fixture preserved, grants revoked, extension unpublished. Consolidation engineering lands on `main` via draft PR only — **no** Production deploy/merge/promote in that PR’s authorization.
