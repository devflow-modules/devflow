# ApplyFlow Persistence V2 — Migration Recovery Runbook

Engineering reference for V1 → V2 Jobs/Applications migration (F3.1–F3.5).

No secrets or environment-specific credentials belong in this document.

## Normal migration path

1. Feature flag `APPLYFLOW_PERSISTENCE_V2=true`.
2. Browser has canonical V1 Jobs and/or Applications (`APPLYFLOW_DASHBOARD_JOBS_V1`, `APPLYFLOW_DASHBOARD_IMPORT_V1`).
3. Dashboard gate resolves `migration_required` (no valid completion marker for the current logical fingerprint).
4. Migration UX shows a sanitized summary (`prepareMigration` / F3.3) — no mutation.
5. User explicitly clicks **Migrar dados para V2**.
6. F3.3 coordinator: prepare → `POST /api/applyflow/v2/migration` → validate completion proof → persist F3.1 marker.
7. Gate re-evaluates → `v2_ready` → dashboard reads via V2 adapter/APIs.

## Migration success and failure (AF-REL-002)

Authoritative contract: [ADR-PERSISTENCE_V2_PARTIAL_RESUMABLE_MIGRATION.md](./ADR-PERSISTENCE_V2_PARTIAL_RESUMABLE_MIGRATION.md).

### SUCCEEDED

Server verified the full fingerprint-matched bundle, `ApplyFlowMigrationSession.status === "completed"`, and `canonicalPersistence === "v2_cloud"` (complete + promote are one transaction). Client marker is written only after proof validation.

### FAILED / INTERRUPTED

Canonical remains `v1_local`. V1 browser data remains intact and authoritative for the product dashboard. Durable **noncanonical** cloud Jobs/Applications **may** already exist from the interrupted import. Retry the **same** fingerprint — do not expect automatic rollback of staging rows. Session statuses `pending` / `importing` / `failed` are **not** canonical V2 authority.

### Session state machine

| Status | Meaning | Canonical |
| --- | --- | --- |
| `pending` | Session opened | `v1_local` |
| `importing` | Incremental Job then Application writes | `v1_local` |
| `failed` | Conflicts recorded; no promotion | `v1_local` |
| `completed` | Verified + promoted (atomic) | `v2_cloud` |

`completed → importing` is forbidden. Response-loss after commit: retry same fingerprint returns idempotent proof; no duplicate rows.

### Observability note

`processedJobs` / `processedApplications` are reset when a non-completed session resumes importing and are written on fail/complete. They are **not** reliable mid-loop progress telemetry.

### Abandoned staging

Partial cloud rows may remain indefinitely. No automatic GC in this protocol. Empty activation refuses non-empty cloud; conflicting IDs fail closed without overwrite. Explicit cleanup is a **future** slice.

## How completion is proven

Authoritative proof is the **server completion payload** from F3.2:

- `status === "completed"`
- matching `fingerprint`
- expected/processed job and application counts
- `sessionId` + `completedAt`

The local marker (`APPLYFLOW_V1_TO_V2_MIGRATION_V1`) is a **browser cutover reference**, not server authority. It is written only after proof validation.

## What remains local

Migration **copies** Jobs/Applications to the account. It does **not** delete:

- `APPLYFLOW_DASHBOARD_JOBS_V1`
- `APPLYFLOW_DASHBOARD_IMPORT_V1`
- Analytics / contacts / inbound / resume library keys

Post-cutover: complete-backup-retained until a future explicit cleanup slice.

## Retry semantics

- Unchanged V1 dataset → same fingerprint → F3.2 reuses the same session (resume or completed idempotent path).
- Safe to retry after network/API/proof/marker failures **and** after mid-import crashes (equivalent rows skipped).
- Completed sessions never return to `importing`.
- Do not invent a parallel migration protocol in ops tooling.
- Do **not** claim all-or-nothing physical storage or automatic staging cleanup.

## Marker failure recovery

If the server completed but the browser failed to persist the marker:

1. UI must **not** claim cutover success.
2. V1 remains intact.
3. Retry/resume recovers the completed session proof and writes the marker.
4. No duplicate Jobs/Applications.

## Conflict behavior

If a preserved ID already exists in V2 with materially divergent content:

- API returns structured `migration_conflict` (HTTP 409).
- Session is **not** completed.
- Existing V2 rows are **not** overwritten.
- V1 remains intact.
- No marker.
- F3.4 UX has no force-overwrite.

## Flag OFF / GLOBAL=false

With `APPLYFLOW_PERSISTENCE_V2` off (or unset):

- Accounts still on `canonicalPersistence=v1_local` use the V1 persistence path.
- Accounts already on `canonicalPersistence=v2_cloud` resolve to **`v2_paused`** — **no silent V1 fallback**.
- Retained browser data may exist as backup/cache but is not promoted to canonical authority.
- V2 server rows are **not** automatically deleted.

## Empty V1 activation

When the authenticated pilot has empty V1 Jobs/Applications:

1. Mode `v2_offering` (GLOBAL on + pilot eligible + `v1_local`).
2. Explicit empty activation (`POST /api/applyflow/v2/activate`) with server empty-state proof.
3. Durable completed audit `ApplyFlowMigrationSession`.
4. Canonical promotion to `v2_cloud` → `v2_active`.

This path does **not** invent Jobs/Applications and does not use client-supplied canonical flags.

## Database topology (mandatory)

| Surface | Target |
| --- | --- |
| **Production** | Supabase project `qygwhuwvilkekfkgoizb` — **PROTECTED**. Never used for DEV/E2E/cleanup. |
| **Local development** | Docker PostgreSQL via `apps/applyflow/docker-compose.yml` (`pnpm db:up` / `pnpm db:migrate`) |
| **CI real DB** | Ephemeral PostgreSQL only (never Production credentials) |

Destructive tools/tests use a structural fail-closed guard (`db-target-guard.ts`):

- Production project → **DENY**
- Any `*.supabase.co` / `*.supabase.com` → **DENY**
- Unknown remotes → **DENY**
- `localhost` / `127.0.0.1` → **ALLOW**

`APPLYFLOW_F3_5_E2E=1` does **not** bypass Production denial.

## What NOT to delete

- Production or unknown customer data
- Production `ApplyFlowAccount` / `auth.users` (never part of E2E)
- Schema/migrations
- Broad `DELETE` without ID/fingerprint filters

Surgical cleanup of test fixtures must target deterministic IDs (e.g. `e2e_f35_*`) and known migration fingerprints only, and only after the DB target guard allows the connection.

## Inspect a migration session safely

Read-only checks (Prisma or SQL) scoped by account:

- `ApplyFlowMigrationSession` by `fingerprint` or `id`
- status, expected/processed counts, `completedAt`
- matching `ApplyFlowJob` / `ApplyFlowApplication` IDs

Never log connection strings, tokens, or PII. Prefer host classification from `classifyApplyFlowDbTarget` / `pnpm db:audit`.

## Dataset limits

Current protocol: ≤50 Jobs and ≤50 Applications per migration.

Over limit → `migration_dataset_too_large` — no truncation, no POST, no marker.

Multi-chunk is deferred.

## Production readiness checklist (DO NOT execute from this runbook alone)

1. Deploy code with flag **OFF**.
2. Apply production schema migrations (approved change window).
3. Post-schema health check / readiness.
4. Pilot activation (narrow cohort / flag).
5. Observe migrations (success, conflicts, marker failures).
6. Rollback criteria (flag OFF; V1 retained).
7. Broader flag activation.
8. Explicit V1 cleanup — **separate future slice**.
9. Extension sync — **separate future slice**.
10. Inbound V2 confirmation — **separate future slice**.

## Local PostgreSQL workflow

```bash
cd apps/applyflow
pnpm db:up          # docker compose up -d (host port 5434)
pnpm db:migrate     # prisma migrate deploy (LOCAL only)
pnpm db:status      # migration status
pnpm db:audit       # host classification + aggregate counts (no secrets)
pnpm db:down        # stop container (volume retained)
```

Point `apps/applyflow/.env.local` at Docker only (gitignored). Do not load Production Supabase URLs into auto-loaded local env.

## Automated validation

Opt-in suite (mutates only local/ephemeral fixtures):

```bash
# from apps/applyflow, with LOCAL Docker .env.local
# Windows PowerShell:
$env:APPLYFLOW_F3_5_E2E = "1"
pnpm exec vitest run src/lib/persistence-v2/migration/f3-5-migration-e2e.test.tsx

# Read-only env/DB classification audit (no secrets printed):
pnpm db:audit
```

Without `APPLYFLOW_F3_5_E2E=1`, mutating cases are skipped; offline invariants (including Production denial) still run.

Production migration / Auth URL / Vercel env changes belong to **explicit production rollout gates**, not this E2E suite.

## Production backup (pre-rollout)

Supabase Free does not imply PITR. Before Production schema/ops windows, take a logical dump with operator credentials held outside `.env.local`, e.g. `pg_dump` against Production `DIRECT_URL` — never commit dump files.

### Extension grant scopes — catalog read 2026-10-21

Read-only session on the Production pooler (`aws-0-sa-east-1.pooler.supabase.com`, host fingerprint `3c193d95207920e0`, database `postgres`, Postgres 17.6), transaction `READ ONLY`. No migration, resolve, or write was run.

| Fact | State |
| --- | --- |
| `20261020140000_extension_grant_scopes` | Pending. No finished, failed, or rolled-back row in `_prisma_migrations`. |
| `20261020210000_extension_grant_scopes_legacy_default` | Pending. No finished, failed, or rolled-back row. |
| Last finished migration | `20261005170000_account_personal_persistence` (`finished`, not rolled back, `applied_steps_count` 1). |
| `applyflow_extension_grants.scopes` | Column absent. Nullability and DEFAULT do not exist yet. |

`migrate resolve` stays a separate human decision after a later catalog check. Do not run it while both migrations are absent.

### Backup evidence 2026-10-21

“Backup mechanism present” is not “recovery tested”. The 2026-10-02 Phase 12C note in [`BETA_EVIDENCE.md`](./BETA_EVIDENCE.md) does not protect schema or data changes after that date.

Checked, without creating or restoring a backup:

- **WAL archiving is on.** `archive_mode=on`, `wal_level=logical`, `archive_timeout=120`, `archive_command` runs `wal-g` `wal-push`. `pg_stat_archiver`: `archived_count=7`, `failed_count=0`, `last_archived_time=2026-10-21T18:51:19.889Z`, `last_failed_time` null. The count can reset when the archiver restarts, so it is not a retention window. No Supabase management token was available, so the last restorable point, retention, and the console restore procedure were not read. PITR is not verified.
- **Named Production dump was not found.** `applyflow-production-clean-20260927-195051.dump` (recorded SHA-256 `c6475f78e41dd4141fb48779ce8902421ef25d2f79619fa5cc8c99cb6d1f25ea`) is not in the repo, `apps/applyflow/.tmp`, Desktop, Documents, or Downloads. The Phase 12C custom dump (299388 bytes, SHA-256 not stored in git) was also not found. Neither file is available evidence for this window.
- **Local drill is not a Production backup.** `apps/applyflow/.tmp/backup-drill/applyflow-local-drill.dump` (13194 bytes, 2026-10-01T17:19:20Z, SHA-256 `538384758b2f6f9f9bcb1cdb05ffd6fba4015082c53574ab2da257a61f85e803`) matches `drill-report.json`. `pg_restore -l` exits 0. The report records a restore into local `127.0.0.1` / `applyflow` with `ok: true` and `restoreExitStatus` 1, which the drill script accepts for ignorable version warnings. That tested a local database from 2026-10-01. It does not include Production data and predates `20261005170000`.

The backup gate below was executed on 2026-10-21 after explicit approval. Merge, containment, migration, resolve, deploy, and flag changes were not part of that approval and were not run.

### Current backup and isolated restore — executed 2026-10-21

| Field | Value |
| --- | --- |
| File | `applyflow-production-pre-scopes-20261021T193045Z.dump` |
| Directory | `C:\Users\Xakep\devflow-applyflow-backups\` (outside git; ACL limited to the operator account) |
| Written (UTC) | 2026-10-21T19:30:49Z |
| Bytes | 408023 |
| SHA-256 | `b97a419cf4d7507c33e83fb7a9ce034522171b29b0b80de437336418f3eff604` |
| `pg_restore -l` | exit 0, 664 TOC lines |
| Source | Production session pooler, host fingerprint `3c193d95207920e0`, database `postgres`. `pg_dump` exited 0. Production was not written. |

Isolated restore: disposable Postgres 17 on `127.0.0.1:5441`, database `applyflow_restore_check`, container `applyflow-pg-restore-check`. `pg_restore --no-owner --no-acl` exited 1 with two errors only: extension `supabase_vault` does not exist, and relation `vault.secrets` does not exist. Those are Supabase platform objects, not ApplyFlow tables. The ApplyFlow catalog in that database matched the pre-scopes Production state:

- `20261005170000_account_personal_persistence` finished, not rolled back, `applied_steps_count` 1
- both scopes migrations absent
- `scopes` column absent
- 11 `applyflow_%` tables in `public`

The container was removed after those checks. The local database on port 5434 was not used. The dump file was kept. It is a copy of Production personal data and must not be committed, logged, or pasted. Deleting it requires a separate retention decision.

### Scopes launch — executed 2026-10-21

The catalog table above is the pre-migration read. After explicit approval, `prisma migrate deploy` (Prisma 6.19.2) applied both scopes migrations on the Production session pooler (host fingerprint `3c193d95207920e0`, port 5432, database `postgres`). `migrate resolve` was not used. A following `READ ONLY` check recorded:

| Fact | State |
| --- | --- |
| `20261020140000_extension_grant_scopes` | Finished, not rolled back, `applied_steps_count` 1. |
| `20261020210000_extension_grant_scopes_legacy_default` | Finished, not rolled back, `applied_steps_count` 1. |
| `applyflow_extension_grants.scopes` | `NOT NULL`. DEFAULT is exactly `profile:read`, `profile:write`, `jobs:read`, `jobs:write`, `applications:read`, `applications:write`. No `contacts` scope. |

PR #262 was merged to `main` as `2e7fb7509462accda468a9f6a95075795a7595b2`. Git branch `production` was fast-forwarded to that commit. The public alias `devflow-applyflow.vercel.app` serves production deployment `dpl_EkYCrFVa7gbri1DJbJtPfukZ2jJ2`, SHA `2e7fb7509462accda468a9f6a95075795a7595b2`, `READY`. `GET /api/applyflow/v2/extension/session` on that alias returned HTTP 401 `{"error":"unauthenticated"}`.

`APPLYFLOW_PERSISTENCE_V2` stayed `false`. The temporary empty `APPLYFLOW_PERSISTENCE_V2_ROLLOUT_ACCOUNTS` was removed after the merged SHA was serving, then that SHA was redeployed so the running snapshot no longer has the variable. Absent and empty are equivalent while the flag is not exactly `true`; this did not turn persistence v2 on and did not add account ids. The project ignore command is `cd ../.. && node scripts/applyflow-vercel-ignore.mjs`. Old deployments were not deleted. The pre-scopes dump was kept.

The same merge did not appear as a portal production deployment on its own. Portal project `devflow` (`production` branch `main`, no ignore command) was then deployed from git SHA `2e7fb7509462` as `dpl_DrZPQ6p5n2dprK5ohWuzvvQovg1F`. WhatsApp recorded a production deployment of that SHA as `CANCELED` (ignore step). Financeiro had no deployment of that SHA.
