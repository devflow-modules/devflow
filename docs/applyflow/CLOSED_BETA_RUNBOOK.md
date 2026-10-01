# ApplyFlow — Closed Beta Operator Runbook (Phase 9D)

Invite-only technical beta for **10–50 users**. Not public signup. Not paid SaaS.

Related:

- [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md)
- [`BACKUP_RESTORE.md`](./BACKUP_RESTORE.md)
- [`APPLICATION_LIFECYCLE.md`](./APPLICATION_LIFECYCLE.md)
- [`PERSISTENCE_V2_FIRST_PRODUCTION_PILOT_RUNBOOK.md`](./PERSISTENCE_V2_FIRST_PRODUCTION_PILOT_RUNBOOK.md)

## Preconditions

- TheirStack **OFF** on shared/hosted deploy (`APPLYFLOW_THEIRSTACK_ENABLED=false` or hosted default deny)
- `APPLYFLOW_PERSISTENCE_V2` only when Postgres pilot DB is ready
- Pilot access is **server-authoritative** (`pilotEligible` + canonical mode) — never client-only
- Error tracking DSN configured by operator (`APPLYFLOW_SENTRY_DSN` / `SENTRY_DSN`) — optional code path; **OPERATOR ACTION REQUIRED** if unset
- Backup cadence owned (see BACKUP_RESTORE.md)
- Rollback target deployment known

## Invite / grant pilot access

```bash
cd apps/applyflow
pnpm pilot:grant -- --auth-sub <supabase_user_id>
pnpm pilot:status -- --auth-sub <supabase_user_id>
```

User must then complete empty activation (or migration) so `canonicalPersistence=v2_cloud`.

## Revoke access

```bash
pnpm pilot:revoke -- --auth-sub <supabase_user_id>
```

Revoke does not delete Jobs/Applications. For data removal see below.

## Disable provider (TheirStack)

Set `APPLYFLOW_THEIRSTACK_ENABLED=false` (or leave unset on hosted — fail closed).

Redeploy if env changed on Vercel. Confirm search returns `provider_not_available` with zero upstream calls.

## Check errors

1. Confirm DSN present (do not paste values): `pnpm beta:check`
2. In the error product UI, filter ApplyFlow environment + release (`VERCEL_GIT_COMMIT_SHA` / `VERCEL_ENV` when available)
3. Expected product 4xx (401/403/409/422/429) should generally **not** alert as fatal
4. Unexpected 500 / uncaught client/server exceptions should appear

No public “throw error” route exists. Prefer staging/local mock transport tests in CI.

## Backup

Before migration/deploy affecting persistence:

```bash
pnpm backup:drill   # local/CI only — proves mechanics
# Operator: logical dump of pilot DB to off-git storage; record SHA-256 + timestamp
```

Recurring during active closed beta: **daily** logical dump while multi-user cloud pilot is active (see BACKUP_RESTORE.md).

## Restore

Follow BACKUP_RESTORE.md. Code rollback ≠ DB rollback.

## Remove pilot / test data (operator)

Manual SQL / Prisma against **pilot** DB only (never Production unless dual-confirmed):

1. Identify `ApplyFlowAccount.id` by `authProviderSub`
2. Delete Applications for that `accountId`
3. Delete Jobs for that `accountId`
4. Delete migration sessions for that `accountId`
5. Optionally delete or revoke the account row

Do **not** claim GDPR self-service compliance. Self-service deletion is deferred.

## Failed App ↔ Job sync

Cloud lifecycle uses a **server transaction** (`POST .../applications/:id/lifecycle`) when available.

If an older client path still performs two writes:

1. Check Application status vs linked Job (`sourceJobId`)
2. Retry lifecycle transition (OCC will reject stale versions)
3. Do **not** auto-mutate on page render

Cloud history (event timeline) remains **not** server-authoritative.

## Roll back deployment

1. Identify last known-good Vercel deployment / git SHA
2. Promote previous deployment (Vercel dashboard / CLI)
3. If a DB migration was applied (Phase 9D expects **none**): code rollback alone may be insufficient — restore DB from backup if schema diverged

## Deploy checklist (closed beta)

- [ ] Vitest green (core + applyflow)
- [ ] Local-first E2E green
- [ ] V2 E2E green (isolated Postgres)
- [ ] TheirStack OFF
- [ ] `pnpm beta:check` pass (DSN warning acceptable if operator tracks separately)
- [ ] Backup confirmed / drill recently passed
- [ ] Pilot accounts explicit
- [ ] Env validated (Origin URL, DB target local/pilot)
- [ ] Commit SHA noted
- [ ] Rollback target known

## Readiness script

```bash
cd apps/applyflow
pnpm beta:check
```

Presence/policy only — never prints secret values.
