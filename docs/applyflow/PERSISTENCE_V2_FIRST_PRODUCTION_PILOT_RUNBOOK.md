# ApplyFlow Persistence V2 — First Production Pilot Runbook

**Canonical ops gate document for the first Production pilot.**  
Implements R2.2.6 operator controls. **Do not execute this runbook until explicitly authorized.**

Related engineering reference: [`PERSISTENCE_V2_MIGRATION_RUNBOOK.md`](./PERSISTENCE_V2_MIGRATION_RUNBOOK.md) (migration recovery semantics).

## Frozen domain semantics (operator)

- `pilotEligible` and `canonicalPersistence` are **independent**.
- `pilotEligible=false` does **not** imply `canonicalPersistence=v1_local`.
- Operator CLI may **only** flip `pilotEligible`. There is **no** command to set `canonicalPersistence` or downgrade `v2_cloud → v1_local`.
- After revoke:
  - `v1_local` + `pilot=false` → mode `v1`
  - `v2_cloud` + `pilot=false` + GLOBAL=`true` → mode `v2_read_only`
  - `v2_cloud` + GLOBAL=`false` → mode `v2_paused`

## Operator CLI (local only)

Working directory: `apps/applyflow`

```bash
pnpm pilot:status -- --account <ApplyFlowAccount.id|authProviderSub>
pnpm pilot:grant  -- --account <id> --confirm <token-from-status>
pnpm pilot:revoke -- --account <id> --confirm <token-from-status>
```

Production double-gate (future authorized mutations only):

```bash
pnpm pilot:grant -- --account <id> --confirm <token> \
  --production --confirm-production <hostFingerprint> \
  --env-file <path-outside-repo>
```

- Prefer exact `ApplyFlowAccount.id` (UUID) or exact `authProviderSub`.
- Email / display-name / substring lookup is rejected.
- Weak `--yes` is rejected; confirmation is target-and-state bound.
- Output is JSON, sanitized (no DB URI, passwords, or auth tokens).
- Known Production pooler host fingerprint: `3c193d95207920e0` (`aws-0-sa-east-1.pooler.supabase.com`).
- Known Production project ref: `qygwhuwvilkekfkgoizb` (sa-east-1).

---

## Gate A — Code

Before any Production pilot:

1. R2.2.1–R2.2.6 merged into `main`.
2. CI green on the promoted commit.
3. Production code promoted (Vercel) to that commit.
4. `APPLYFLOW_PERSISTENCE_V2` remains **`false`**.
5. No Production pilot grant yet (`pilotEligible=false` for all accounts).

**Stop if any item fails.**

---

## Gate B — Recovery

1. Verify an existing clean Production backup is available.
   - Known clean backup (historical): `applyflow-production-clean-20260927-195051.dump`
   - Known SHA-256: `c6475f78e41dd4141fb48779ce8902421ef25d2f79619fa5cc8c99cb6d1f25ea`
2. **Do not assume that backup is sufficient forever.**
3. On actual pilot day:
   - Create a **fresh** pre-pilot backup.
   - Verify SHA-256.
   - Verify `pg_restore -l`.
   - Record location **outside** the git repo.
4. Confirm restore procedure is understood before continuing.

**Stop if backup proof is incomplete.**

---

## Gate C — Production schema

GLOBAL must still be **`false`**.

Apply **only** ApplyFlow Prisma migrations:

```bash
cd apps/applyflow
# target guard + DB identity proof + migration status + backup proof FIRST
pnpm exec prisma migrate deploy
```

**Never** run root `pnpm db:migrate:deploy` (targets Financeiro).

Before:

- Target guard / positive Production identity proof
- `prisma migrate status`
- Backup proof (Gate B)

After:

- Expected migrations applied
- No unexpected schema drift
- Data counts sanity-checked (sanitized)

**Stop if migrate status or drift is unexpected.**

---

## Gate D — First user

With GLOBAL=`false`:

1. Authenticate through Production Supabase (supported app flow).
2. Provision `ApplyFlowAccount` through the supported application flow.
3. **Do not** manually `INSERT` the account via SQL.
4. Verify with operator status:

```bash
pnpm pilot:status -- --account <id> --production --env-file <path> # status is read-only; --production not required for status but env-file may be
```

Expected new account:

- `pilotEligible=false`
- `canonicalPersistence=v1_local`

**Stop if defaults differ.**

---

## Gate E — Grant pilot

1. `pilot:status` — confirm correct account fingerprint and `canonical=v1_local`.
2. Copy `confirmToken` from status output.
3. Grant:

```bash
pnpm pilot:grant -- --account <id> --confirm <token> \
  --production --confirm-production <hostFingerprint> \
  --env-file <path-outside-repo>
```

4. Re-status: `pilotEligible=true`, **canonical still `v1_local`**.

**Stop if canonical changed.**

---

## Gate F — Enable GLOBAL

Only after the pilot account is granted:

1. Change `APPLYFLOW_PERSISTENCE_V2`: `false` → `true` (Production env).
2. Redeploy per established Vercel workflow.
3. Verify:
   - Pilot account effective mode: `v2_offering`
   - Non-pilot account: `v1`
4. Confirm no broad accidental V2 access.

**Stop if non-pilot accounts see V2 offering/active.**

---

## Gate G — Pilot migration (legacy V1 data)

For a pilot with local legacy Jobs/Applications:

1. Open dashboard.
2. Verify offering / migration UX.
3. Execute migration.
4. Verify server migration proof (completed session).
5. Verify `canonicalPersistence=v2_cloud`.
6. Verify resolver mode `v2_active`.
7. Verify cloud Jobs/Applications.
8. Verify local backup markers remain present (no silent wipe).

**Stop if canonical is not `v2_cloud` after successful migration proof.**

---

## Gate H — Empty pilot

If the first pilot has empty V1:

1. Use explicit **"Ativar sincronização na nuvem"**.
2. Verify empty attestation + server activation.
3. Verify `canonical=v2_cloud`, bootstrap refresh, mode `v2_active`.
4. Perform first cloud write.

**Stop if activation succeeds without `v2_cloud`.**

---

## Gate I — CRUD smoke

Controlled smoke after `v2_active`:

1. Create / read / update Job
2. Create / read / update Application
3. Refresh browser
4. New browser / session
5. Confirm data remains cloud-backed

No local-marker requirement for cloud authority.

**Stop on persistence failure across refresh/session.**

---

## Gate J — Revocation test

After `canonical=v2_cloud`:

1. Revoke pilot via operator CLI (same double-gate as grant).
2. With GLOBAL=`true`, expect mode `v2_read_only`.
3. Verify reads work; writes fail.
4. Re-grant if the pilot continues.
5. **`canonicalPersistence` must remain `v2_cloud` throughout.**

**Stop if revoke mutates canonical or falls back to V1.**

---

## Gate K — Kill switch test (document only in R2.2.6)

Controlled test **only when explicitly authorized** (not part of R2.2.6 execution):

1. GLOBAL `true` → `false`
2. Pilot with `canonical=v2_cloud` → mode `v2_paused`
3. Verify **no V1 fallback**
4. Restore GLOBAL=`true` if the pilot continues

Document results; do not improvise.

---

## Gate L — Success criteria

Pilot success requires all of:

- Auth correct
- Account-scoped pilot correct
- Migration / empty activation correct
- `canonicalPersistence=v2_cloud`
- CRUD persistence correct
- Refresh / new browser correct
- Read-only revoke correct
- Kill-switch semantics documented / proven when authorized
- No IDOR
- No stale V1 fallback
- No unexpected DB rows
- CI healthy

---

## Emergency response (by canonical state)

### Case: `canonical=v1_local` (problem before migration)

Safe response:

- Revoke pilot and/or set GLOBAL=`false`
- V1 remains canonical
- Investigate without touching cloud rows

### Case: `canonical=v2_cloud` (problem after migration)

**DO NOT downgrade to V1. There is no operator command for that.**

Options:

- Revoke pilot → `v2_read_only` while GLOBAL=`true`
- GLOBAL=`false` → `v2_paused`
- Preserve cloud data
- Investigate / redeploy / fix

**Never** instruct operators to restore stale `localStorage` automatically as canonical truth.

---

## R2.2.6 slice constraints

This slice **must not** (and did not) execute:

- Production schema migrate
- Production user creation
- Production pilot grant
- V2 GLOBAL enable
- Deploy
- Any Production mutation

Wait for explicit authorization before Gates C–K.
