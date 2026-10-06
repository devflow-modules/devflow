# ApplyFlow — architecture

Current system design (not a chronological build log).

Entry: [`apps/applyflow/README.md`](../../apps/applyflow/README.md) · Flow: [`PRODUCT_FLOW.md`](./PRODUCT_FLOW.md)

---

## Context diagram

```text
Browser
 ├─ Resume / profile (local ResumeLibrary)
 ├─ Discovery UI
 ├─ Deterministic Match Engine (@devflow/applyflow-core)
 ├─ Local-first Jobs / Applications (default)
 └─ Optional V2 client adapter
      └─ Next.js ApplyFlow API
           ├─ Auth (Supabase session / E2E test-only gate)
           ├─ Tenant-scoped repositories (accountId)
           ├─ Provider adapters (Jobgether / Remote OK / TheirStack*)
           └─ PostgreSQL (Prisma)

* TheirStack disabled by default on shared Vercel hosts
```

Provider search path:

```text
Browser → POST /api/applyflow/job-sources/search
       → Origin allowlist
       → Auth / provider policy
       → Adapter
       → Provider network (or E2E fixtures)
       → JobSearchHit (no CV in request)
```

---

## Packages and apps

| Path | Role |
|------|------|
| `apps/applyflow` | Next.js product: dashboard, discovery, V2 API, ops scripts |
| `apps/applyflow-extension` | Chrome MV3 Easy Apply assist (local storage; no auto-submit) |
| `packages/applyflow-core` | Domain: match, lifecycle, readiness, types |
| `packages/career-core` / `career-sync` | CareerBundle / sync contracts (suite bridge) |
| `apps/interview-lab` | Downstream consumer of CareerBundle |

Apps do not import other apps — only `packages/*`.

---

## Local-first vs V2 / cloud

### Local-first (default)

- Jobs/Applications in browser storage
- Resume library in browser
- Works without Postgres
- Durability limited by the browser profile

### V2 / cloud (pilot)

- Requires `APPLYFLOW_PERSISTENCE_V2=true`
- Server-derived account (`authProviderSub` → `ApplyFlowAccount`)
- `pilotEligible` + `canonicalPersistence=v2_cloud` (activation / migration)
- Jobs/Applications in PostgreSQL with composite ownership
- OCC via `expectedVersion` on PATCH
- Transactional lifecycle: `POST /api/applyflow/v2/applications/:id/lifecycle`
- Resume/profile, contacts, inbound responses, and career events are account-owned when `canonicalPersistence=v2_cloud` (`v2_active` / `v2_read_only`). Local mode keeps the existing browser stores. Cloud writes do not fall back to those stores.
- Analytics for cloud accounts are derived from applications, recorded transition events, contacts, and response states. Queue, readiness, and next-action tables are not stored.
- Nango Gmail/Calendar ownership is the ApplyFlow account. See the Nango ADR.

V2 is **not** “sync all local state.” It is an authenticated persistence mode for Jobs/Applications (and related account records).

Deep reference: [`PERSISTENCE_V2.md`](./PERSISTENCE_V2.md).

---

## Auth and tenancy

- Account identity is server-derived — never trust client `accountId`
- Repositories scope by `accountId`
- Cross-tenant reads/mutations return `not_found` (or capability denies) — proven in V2 E2E
- E2E auth bypass: signed cookie only when fail-closed E2E runtime allows (never on `VERCEL=1` / production)

---

## Observability

Canonical env: `APPLYFLOW_SENTRY_DSN` (fallback `SENTRY_DSN` / `NEXT_PUBLIC_APPLYFLOW_SENTRY_DSN`).

Missing DSN → no-op. With DSN → minimal Sentry **envelope** transport behind `captureApplyFlowException` only (no `@sentry/nextjs` auto-instrumentation).

Payloads redact cookies, Authorization, resume/CV/profile fragments, DB URL fragments, provider-key fragments, and job-description fragments. Expected product 4xx (400/401/403/404/409/422/429) are not captured.

Intentionally **not** enabled: source-map upload, performance tracing, session replay, profiling, user PII identity.

Operator proof: `pnpm sentry:verify` (never a public throw route).

---

## Security controls (closed beta)

- Origin allowlist on search + V2 mutating routes
- Security headers baseline (frame, nosniff, referrer, permissions, minimal CSP)
- Provider secrets server-only
- TheirStack shared-disable without distributed limiter
- Playwright refuses non-local base URLs
- Prisma mutate scripts refuse non-local DB hosts (`db:migrate` force-local)

Not claimed: “fully secure,” GDPR/LGPD compliance, encryption-at-rest guarantees beyond host defaults.

---

## ADRs (major)

- [`ADR-LOCAL_FIRST_VS_SERVERLESS.md`](./ADR-LOCAL_FIRST_VS_SERVERLESS.md)
- [`ADR-PERSISTENCE_V2_LOCAL_AND_CLOUD.md`](./ADR-PERSISTENCE_V2_LOCAL_AND_CLOUD.md)
- [`ADR-PERSISTENCE_V2_PARTIAL_RESUMABLE_MIGRATION.md`](./ADR-PERSISTENCE_V2_PARTIAL_RESUMABLE_MIGRATION.md)
- [`ADR-NANGO-BROWSER_SCOPED_PROVIDER_IDENTITY.md`](./ADR-NANGO-BROWSER_SCOPED_PROVIDER_IDENTITY.md)

---

## Related Career Suite paths

Gmail/Calendar Nango, LibreChat, and controlled LLM boundaries live under `docs/career-suite/`. They are **adjacent** pilots — not the core Match Engine and not required for the discovery → lifecycle funnel.
