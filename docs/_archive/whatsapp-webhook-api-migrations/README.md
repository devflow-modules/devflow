# Archived migrations — `apps/whatsapp-webhook-api` (RP-3)

**Status:** historical / documentary only  
**Origin:** `apps/whatsapp-webhook-api/prisma/` (removed in RP-3)  
**Date archived:** 2026-08-04

## What this is

Non-executable archive of the Prisma schema snapshot and the single historical migration that lived under the legacy Express app:

- `20250311120000_whatsapp_schema/migration.sql`
- `schema.prisma.snapshot` (schema as last present in the retired app)
- `migration_lock.toml` (if present at retirement)

The **canonical** WhatsApp Prisma history and runtime live under `apps/whatsapp-platform/prisma/`. The same migration name also exists in the platform tree; this folder exists only to preserve provenance of the retired app’s copy.

## Do not

- Run these SQL files or `prisma migrate` / `db push` against production or any live database from this archive.
- Treat this archive as authorization to DROP tables, truncate data, or “clean up” WhatsApp schemas.
- Reintroduce `apps/whatsapp-webhook-api` without a new explicit product decision.

## Preserve

- Git history of the retired app (recoverable via PR rollback / checkout of the pre-RP-3 SHA).
- Existing database tables, schemas, and data — RP-3 does **not** alter production data stores.
- DNS residual and Meta Callback (handled outside RP-3; Callback remains on `apps/whatsapp-platform`).

## Rollback

Restore the app directory and workspace references via PR revert against the SHA immediately before the RP-3 merge (or restore the Draft PR branch commit history).
