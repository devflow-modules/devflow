# ApplyFlow — Closed Beta Operator Runbook

Invite-only technical beta for **10–50 users**. Not public signup. Not paid SaaS.

Related: [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) · [`BACKUP_RESTORE.md`](./BACKUP_RESTORE.md) · [`TESTING.md`](./TESTING.md)

---

## Preflight

```bash
cd apps/applyflow
pnpm beta:check
```

Confirm (without printing secrets):

- TheirStack OFF on shared/hosted (`APPLYFLOW_THEIRSTACK_ENABLED` not true)
- `APPLYFLOW_PERSISTENCE_V2` only with ready Postgres
- Error DSN configured (or accepted warning)
- Dangerous E2E flags absent on Vercel (`APPLYFLOW_E2E*` must never be on hosted)
- Rollback target deployment known
- Backup cadence owned

---

## TheirStack verification

Shared/hosted: search with `provider: theirstack` must return `provider_not_available` with **zero** upstream calls.

---

## Error tracker verification

1. Configure `APPLYFLOW_SENTRY_DSN` on Vercel project `devflow-applyflow` (Production required; Preview optional under Production-controlled smoke).
2. `pnpm beta:check` — warns if DSN missing; with DSN reminds to prove ingest.
3. Local/operator proof (never prints DSN):

```bash
cd apps/applyflow
# Load DSN into the shell env without committing it
pnpm sentry:verify
```

4. Confirm one event in Sentry project **applyflow**: message `applyflow_sentry_verify`, environment + release tags present, no secrets/CV/cookies.
5. Expected 4xx should not page as fatal; unexpected 500 / uncaught should appear via the ApplyFlow boundary.

No public “throw error” production route.

Intentionally deferred: source maps, tracing, session replay, profiling.

---

## Backup

```bash
pnpm backup:drill    # local Docker only — proves mechanics
```

Before persistence-affecting deploy: logical dump of pilot DB off-git; record SHA-256 + UTC time.

Active beta: **daily** logical dumps; retain ≥7 days. See [`BACKUP_RESTORE.md`](./BACKUP_RESTORE.md).

---

## V2 pilot grants

Pilot CLI mutates **only** `pilotEligible` (never `canonicalPersistence` directly).

```bash
cd apps/applyflow
pnpm pilot:status -- --account <accountId|authProviderSub>
pnpm pilot:grant  -- --account <id> --confirm <token-from-status>
pnpm pilot:revoke -- --account <id> --confirm <token-from-status>
```

User must complete empty activation (or migration) so `canonicalPersistence=v2_cloud`.

Production mutations require explicit dual gates (`--production` + host fingerprint) — do not run without authorization.

---

## Deploy checklist

- [ ] Vitest green (core + applyflow)
- [ ] `pnpm test:e2e` green
- [ ] `pnpm test:e2e:v2` green (isolated Postgres)
- [ ] TheirStack OFF
- [ ] `pnpm beta:check` acceptable
- [ ] Backup confirmed
- [ ] Pilot accounts explicit
- [ ] Commit SHA noted
- [ ] Rollback target known

---

## Smoke

- Login / account shell
- Discovery fixture or safe provider
- Save job → reload (V2: still present)
- Register → mark sent → one lifecycle transition
- TheirStack still unavailable on shared

---

## Rollback

1. Identify last known-good Vercel deployment / git SHA
2. Promote previous deployment
3. Code rollback ≠ DB rollback — if a schema migration was applied (Phase 9D introduced **none**), restore DB from backup when needed

---

## Incident stop conditions

Stop inviting / freeze deploys if:

- Cross-tenant data exposure suspected
- TheirStack credits burning unexpectedly on shared
- Persistence corruption / failed restores
- Auth bypass reachable outside E2E gate

---

## Remove pilot / test data (operator)

Against **pilot** DB only:

1. Resolve `ApplyFlowAccount` by `authProviderSub`
2. Delete Applications for `accountId`
3. Delete Jobs for `accountId`
4. Delete migration sessions for `accountId`
5. Revoke pilot and/or delete account row

No GDPR self-service claim. Self-service deletion deferred.

---

## App ↔ Job sync issues

Prefer `POST /api/applyflow/v2/applications/:id/lifecycle` (transactional).

If inconsistency appears: compare Application status vs linked Job (`sourceJobId`); retry with fresh `expectedVersion`. Do not auto-mutate on page render. Cloud history timeline is not server-authoritative.
