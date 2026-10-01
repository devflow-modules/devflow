# ApplyFlow — Production Readiness (Closed Beta Gate)

**Status:** Phase 9C closed-beta operational hardening.  
**Not a claim of paid public production readiness.**

Related:

- [`JOB_DISCOVERY.md`](./JOB_DISCOVERY.md) — discovery security / TheirStack cost safety
- [`BACKUP_RESTORE.md`](./BACKUP_RESTORE.md) — backup drill + runbook
- [`PERSISTENCE_V2_FIRST_PRODUCTION_PILOT_RUNBOOK.md`](./PERSISTENCE_V2_FIRST_PRODUCTION_PILOT_RUNBOOK.md) — pilot ops

## Closed Beta Environment

| Control | Policy |
|---------|--------|
| TheirStack | **OFF** on shared Vercel `production` / `preview` (`isTheirStackSearchEnabled`) |
| Search auth | Required when Supabase configured; E2E may force local-first via `APPLYFLOW_E2E_IGNORE_SUPABASE` (local/CI only) |
| V2 cloud | `APPLYFLOW_PERSISTENCE_V2` + server `pilotEligible` — not client-only |
| Provider fixtures | `APPLYFLOW_E2E_PROVIDER_FIXTURES=1` only when E2E runtime gate is open |
| E2E auth bypass | Signed cookie via `/api/applyflow/e2e/session` — refused when `VERCEL=1` or `VERCEL_ENV=production` |

## E2E

```bash
cd apps/applyflow
pnpm exec playwright install chromium
pnpm test:e2e
```

Requirements:

- Local base URL only (`127.0.0.1` / `localhost`) — config refuses remote hosts
- Fixture providers — zero live Jobgether / Remote OK / TheirStack calls
- Isolated from Production Supabase (`qygwhuwvilkekfkgoizb`)

Critical funnel covered: login (E2E session) → discovery → save → queue → readiness → register → mark sent → lifecycle → reload → TheirStack off → logout.

## Error Tracking

Optional DSN: `APPLYFLOW_SENTRY_DSN` or `SENTRY_DSN`.

- Missing DSN: app runs (no-op / structured console when DSN present without SDK)
- Captures unexpected client/server/boundary errors via `captureApplyFlowException`
- Expected 401/403/409/429 are **not** treated as fatal captures
- Messages with Authorization / cookie / resume / CV fragments are redacted
- Operator must configure the external product; repository does not ship credentials

## Security headers

Baseline on ApplyFlow `next.config.ts`:

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (camera/mic/geo disabled)
- Minimal CSP: `frame-ancestors 'self'; base-uri 'self'` only

Strict CSP deferred (Phase 9D / public beta).

## CSRF Status

- Search POST reuses Origin allowlist evaluation from Nango guard (hosted fails closed on missing/cross Origin)
- SameSite=Lax cookies for auth / E2E session
- Broad CSRF token project: **deferred to Phase 9D / public beta**

## Known Closed Beta Limitations

- No server lifecycle event history DB
- App↔Job sync not transactional
- No account/data deletion self-serve
- TheirStack disabled on shared deploy
- Limited mobile polish
- No strict CSP
- Managed PITR: operator verification required (not proven from repo alone)
- Process-local TheirStack quota is **not** multi-instance cost safety

## Accepted for closed beta (trusted / small cohort)

- Local-first V1 persistence for many flows
- Manual backup cadence for V2 pilot DB (see BACKUP_RESTORE.md)
- Error tracking boundary ready; DSN is operator action
