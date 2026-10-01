# ApplyFlow — Production Readiness (Closed Beta Gate)

**Status:** Phase 9D — 10–50 user closed beta operationalization.  
**Not a claim of public signup or paid production readiness.**

Related:

- [`CLOSED_BETA_RUNBOOK.md`](./CLOSED_BETA_RUNBOOK.md) — operator tasks
- [`JOB_DISCOVERY.md`](./JOB_DISCOVERY.md) — discovery security / TheirStack cost safety
- [`BACKUP_RESTORE.md`](./BACKUP_RESTORE.md) — backup drill + cadence
- [`APPLICATION_LIFECYCLE.md`](./APPLICATION_LIFECYCLE.md) — App↔Job consistency
- [`PERSISTENCE_V2_FIRST_PRODUCTION_PILOT_RUNBOOK.md`](./PERSISTENCE_V2_FIRST_PRODUCTION_PILOT_RUNBOOK.md) — pilot ops

## Release classification

| Cohort | Status |
|--------|--------|
| 2–5 trusted users | READY (local-first + ops baseline) |
| 10–50 invite-only closed beta (V2/cloud) | Gate outcome of Phase 9D |
| Public signup | NOT READY |

## Closed Beta Environment

| Control | Policy |
|---------|--------|
| TheirStack | **OFF** on shared Vercel `production` / `preview` |
| Search auth | Required when Supabase configured; E2E may force local-first via `APPLYFLOW_E2E_IGNORE_SUPABASE` (local/CI only) |
| V2 cloud | `APPLYFLOW_PERSISTENCE_V2` + server `pilotEligible` + `canonicalPersistence` — not client-only |
| Provider fixtures | `APPLYFLOW_E2E_PROVIDER_FIXTURES=1` only when E2E runtime gate is open |
| E2E auth bypass | Signed cookie via `/api/applyflow/e2e/session` — refused when `VERCEL=1` or `VERCEL_ENV=production` |
| Mutating Origin | Search + V2 mutating routes reuse centralized Origin allowlist |

## E2E

Local-first critical funnel:

```bash
cd apps/applyflow
pnpm exec playwright install chromium
pnpm test:e2e
```

V2 cloud critical funnel (isolated Postgres required):

```bash
pnpm db:up
pnpm db:migrate
pnpm test:e2e:v2
```

Requirements:

- Local base URL only (`127.0.0.1` / `localhost`) — config refuses remote hosts
- Fixture providers — zero live Jobgether / Remote OK / TheirStack calls
- Isolated from Production Supabase (`qygwhuwvilkekfkgoizb`)
- V2 suite proves: Account A persistence across reload, Account B isolation, cross-tenant mutation blocked, pilot gate, TheirStack off

## Error Tracking

Optional DSN: `APPLYFLOW_SENTRY_DSN` or `SENTRY_DSN`.

- Missing DSN: **OPERATOR ACTION REQUIRED** — app runs with no-op sink
- Mock transport tests cover capture / redact / expected 4xx ignore
- Release/environment: `VERCEL_GIT_COMMIT_SHA`, `VERCEL_ENV` / `NODE_ENV` when present
- Expected product errors (401/403/409/422/429) generally not fatal captures
- Unexpected 500 / uncaught exceptions should be captured
- Messages with Authorization / cookie / resume / CV / DB URL fragments are redacted

## Security headers

Baseline on ApplyFlow `next.config.ts` unchanged from Phase 9C:

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (camera/mic/geo disabled)
- Minimal CSP: `frame-ancestors 'self'; base-uri 'self'` only

Strict CSP deferred to public beta.

## CSRF Status

- Origin allowlist on search + V2 mutating POST/PATCH (activate, migration, jobs, applications, lifecycle)
- SameSite=Lax cookies for auth / E2E session
- Broad token-based CSRF: **deferred to public beta** (invite-only risk accepted)

## App ↔ Job consistency

Server transactional lifecycle: `POST /api/applyflow/v2/applications/:id/lifecycle`.

Dashboard V2 adapter prefers this path. Residual two-step client path remains for non-atomic adapters and reports `job_sync_incomplete` honestly.

Cloud lifecycle **history** (event timeline) is still not server-authoritative.

## Known Closed Beta Limitations

- No server lifecycle event history DB
- No account/data deletion self-serve (operator process only)
- TheirStack disabled on shared deploy
- Limited mobile polish
- No strict CSP
- Managed PITR: operator verification required (not proven from repo alone)
- Process-local TheirStack quota is **not** multi-instance cost safety
- Public signup / billing / abuse controls deferred

## Operator checklist

```bash
pnpm beta:check
```

See CLOSED_BETA_RUNBOOK.md for invite, backup, restore, rollback, deletion.
