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

- Unchanged V1 dataset → same fingerprint → F3.2 reuses the same completed session.
- Safe to retry after network/API/proof/marker failures.
- Completed sessions never return to `importing`.
- Do not invent a parallel migration protocol in ops tooling.

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

## Flag OFF rollback

With `APPLYFLOW_PERSISTENCE_V2` off (or unset):

- Dashboard uses the V1 persistence path.
- Retained V1 data remains usable.
- V2 server rows are **not** automatically deleted.
- Markers/sessions are not a reason to destroy V1.

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
