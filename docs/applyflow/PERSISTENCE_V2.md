# ApplyFlow Persistence V2

**Status:** Migration implementation **COMPLETE** for the first Production pilot (see [`PERSISTENCE_V2_CLOSEOUT.md`](./PERSISTENCE_V2_CLOSEOUT.md)).  
**Baseline:** authenticated pilot on `canonicalPersistence=v2_cloud` / `v2_active` with account-scoped `pilotEligible` and GLOBAL `APPLYFLOW_PERSISTENCE_V2`.

## Decisão de produto

| Modo efectivo | Source of truth |
|------|-----------------|
| **`v1`** | Browser: `localStorage` (dashboard) + `chrome.storage.local` (extensão) |
| **`v2_offering`** | Still `v1_local` until migration or empty activation promotes canonical |
| **`v2_active`** | PostgreSQL ApplyFlow (Jobs/Applications) |
| **`v2_read_only`** | PostgreSQL (reads); writes denied |
| **`v2_paused`** | Canonical remains `v2_cloud`; V2 HTTP paused — **no V1 fallback** |

`localStorage` may remain as cache/draft/backup — **never** as canonical after `v2_cloud`.

## Effective mode matrix

| GLOBAL | pilotEligible | canonical | mode |
| --- | --- | --- | --- |
| false | * | `v1_local` | `v1` |
| true | false | `v1_local` | `v1` |
| true | true | `v1_local` | `v2_offering` |
| false | * | `v2_cloud` | `v2_paused` |
| true | false | `v2_cloud` | `v2_read_only` |
| true | true | `v2_cloud` | `v2_active` |

**One-way:** `v1_local` → `v2_cloud`. Operator CLI never downgrades canonical.

## PATCH concurrency

- Body field `expectedVersion` (positive int) — **required**
- Success → **2xx**; stale → **409** `version_conflict`
- `ETag` informational; do **not** send HTTP `If-Match` (Production observed Vercel `412` split-brain with origin commit)

## Rollout / rollback

- Ops: [`PERSISTENCE_V2_FIRST_PRODUCTION_PILOT_RUNBOOK.md`](./PERSISTENCE_V2_FIRST_PRODUCTION_PILOT_RUNBOOK.md)
- Migration recovery: [`PERSISTENCE_V2_MIGRATION_RUNBOOK.md`](./PERSISTENCE_V2_MIGRATION_RUNBOOK.md)
- Closeout: [`PERSISTENCE_V2_CLOSEOUT.md`](./PERSISTENCE_V2_CLOSEOUT.md)
- **Rollback GLOBAL off** with `canonical=v2_cloud` → `v2_paused` (cloud data retained; no silent V1)

## Ownership

- B2C: rows scoped by `ApplyFlowAccount.id` from server session.
- Never authorize by client-supplied `accountId`.

## Referências

- [Persistence V2 engineering case study](./PERSISTENCE_V2_CASE_STUDY.md)
- [Closeout](./PERSISTENCE_V2_CLOSEOUT.md)
- [ADR — Local-first vs Serverless](./ADR-LOCAL_FIRST_VS_SERVERLESS.md)
- [ADR — Persistence V2 local + cloud](./ADR-PERSISTENCE_V2_LOCAL_AND_CLOUD.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
