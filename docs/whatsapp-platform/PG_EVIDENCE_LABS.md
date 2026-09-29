# PostgreSQL evidence labs (Phase 3)

Opt-in integration tests against a **local disposable** PostgreSQL (`localhost` only). Not run in default CI.

## Prerequisites

- Docker (or set `WHATSAPP_DATABASE_URL` / `WHATSAPP_DIRECT_URL` to an isolated local database)
- `pnpm install` at monorepo root
- `pnpm --filter @devflow/app-whatsapp-platform db:generate`

## Run

From `apps/whatsapp-platform`:

```bash
pnpm run test:pg-evidence
```

Environment:

| Variable | Purpose |
|----------|---------|
| `WHATSAPP_PG_INTEGRATION=1` | Set automatically by the script |
| `WHATSAPP_DATABASE_URL` | Optional override (default: Docker on port **5435**) |
| `WHATSAPP_SKIP_DOCKER=1` | Use existing DB URL only |
| `WHATSAPP_PG_EVIDENCE_PORT` | Host port for auto-started container (default `5435`) |

The script runs `prisma migrate deploy`, migration upgrade simulation (`pg-migration-evidence.ts`), and `pgEvidence.realpostgres.test.ts`.

## Scope

- Inbound idempotency concurrency (c2/c5/c10/c20)
- Thread upsert under concurrent distinct messages
- Stripe webhook claim + fail/retry/process
- Send ledger replay + concurrent claim
- Two-tenant negative matrix (service layer; not full API surface)

## Limitations

- Does not call Meta or Stripe production
- Does not prove complete tenant isolation or production migration timing
- Default Vitest node suite **skips** these tests unless `WHATSAPP_PG_INTEGRATION=1`
