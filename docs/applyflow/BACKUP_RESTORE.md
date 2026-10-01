# ApplyFlow — Backup & Restore

**Non-production drill and closed-beta runbook.**
Never commit dump files. Never target Production from local automation without explicit dual-confirm operator gates.

Related: [`CLOSED_BETA_RUNBOOK.md`](./CLOSED_BETA_RUNBOOK.md) · [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md)

## Safety

Allowed hosts for automated drill: `localhost`, `127.0.0.1` only.

Refused:

- any `*.supabase.co` host
- Production project `qygwhuwvilkekfkgoizb`
- missing / unparseable `DATABASE_URL`

Placeholders only in docs:

```text
DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5434/applyflow
```

## Local prerequisites

```bash
cd apps/applyflow
pnpm db:up
pnpm db:migrate
```

Requires `pg_dump`, `pg_restore`, and `psql` on PATH (PostgreSQL client tools).

## Isolated drill

```bash
cd apps/applyflow
pnpm backup:drill
```

What it does:

1. Validates source URL is local-safe
2. `pg_dump --format=custom` → `apps/applyflow/.tmp/backup-drill/` (gitignored)
3. `pg_restore -l` inspect
4. Creates empty `applyflow_restore_drill` DB
5. Restores dump
6. Counts public tables
7. Drops restore DB
8. Writes sanitized `drill-report.json` (no passwords)

Optional env:

| Variable | Purpose |
|----------|---------|
| `APPLYFLOW_BACKUP_SOURCE_URL` | Override source (must stay local) |
| `APPLYFLOW_BACKUP_RESTORE_DB` | Restore DB name (default `applyflow_restore_drill`) |

## Manual restore (operator)

```bash
pg_dump --format=custom --file "$DUMP" --dbname "$SOURCE_URL"
pg_restore -l "$DUMP"
createdb "$RESTORE_DB"   # or CREATE DATABASE
pg_restore --dbname "$RESTORE_URL" --no-owner --no-acl "$DUMP"
```

Validate at least:

- `applyflow_accounts` (or equivalent account table) present after migrate+data
- jobs / applications tables restore
- unique index `applyflow_applications_account_id_source_job_id_uidx` after migrate
- row counts / checksums for known pilot fixtures

## Closed-beta cadence (10–50 invite-only)

**Owned by operator** (manual is acceptable for this cohort):

1. Backup **before** any schema/deploy change on the V2 pilot DB
2. **Daily** logical dump while multi-user cloud pilot is active
3. Retention: keep at least **7 daily** dumps while beta is active
4. Store dumps **outside** git; record SHA-256 + UTC timestamp
5. Re-run restore drill after tooling/Postgres client changes

No automated cron is required in Phase 9D if operators follow this cadence.

### GO / NO-GO for 10–50 beta

One of the following must be true:

**A.** Managed backup / PITR verified by operator (checklist below)

**OR**

**B.** This recurring manual backup process is accepted and executable
**AND** restore procedure has been proven (`pnpm backup:drill` or equivalent)

Phase 9C proved restore mechanics locally. Phase 9D requires operational ownership.

## Managed backup / PITR — operator checklist

Repository alone **cannot** prove managed PITR. Operator must verify on the hosting console:

- [ ] Managed automatic backups enabled for the pilot Postgres
- [ ] Retention window recorded (dates)
- [ ] PITR / point-in-time available? (yes/no + earliest restore point)
- [ ] Verification date/time (UTC) and verifier name
- [ ] Restore target process documented (new instance vs overwrite — prefer new)

No credentials in this document.

If hosting connector is unavailable: treat as **not verified** and rely on path **B**.

## Public / paid SaaS

Stronger automation (scheduled managed backups + verified PITR + alerting) is required before public/paid production. Deferred.
