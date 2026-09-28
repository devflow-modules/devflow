# ADR — Partial-Resumable Migration with Atomic Canonical Promotion

**Status:** Accepted  
**Date:** 2026-09-28  
**Finding:** AF-REL-002  
**Related:** [ADR-PERSISTENCE_V2_LOCAL_AND_CLOUD.md](./ADR-PERSISTENCE_V2_LOCAL_AND_CLOUD.md), [PERSISTENCE_V2.md](./PERSISTENCE_V2.md), [PERSISTENCE_V2_MIGRATION_RUNBOOK.md](./PERSISTENCE_V2_MIGRATION_RUNBOOK.md)

## Context

Persistence V2 migration **copies** local V1 Jobs/Applications into account-scoped PostgreSQL rows, then promotes `canonicalPersistence` from `v1_local` to `v2_cloud`.

Audit question AF-REL-002: should ApplyFlow guarantee **all-or-nothing physical storage** for every imported row, or **partial-but-resumable** import with an atomic authority transition?

Current implementation already imports Jobs then Applications **outside** a single giant transaction, while `MigrationSession` completion and canonical promotion share one `$transaction`.

## Decision

**OPTION_B — Partial-resumable import + atomic canonical promotion.**

| Layer | Contract |
| --- | --- |
| Entity import (Jobs / Applications) | Partial + resumable; durable staging rows may exist before success |
| Authority transition | Atomic: `status=completed` and `canonicalPersistence=v2_cloud` commit together |
| Failure semantics | **Does not** mean rollback of all imported rows |
| Success semantics | Bundle verified **and** session completed **and** `canonicalPersistence = v2_cloud` |

Closure for AF-REL-002 is **ACCEPTED_BY_DESIGN** (contract formalization), not a behavioral “fix”, unless a separate defect is remediated.

## Product semantics

### Migration SUCCEEDED

All expected Jobs and Applications from the fingerprint-matched bundle are verified in cloud storage, the `ApplyFlowMigrationSession` is `completed`, and `canonicalPersistence = v2_cloud`. Browser cutover marker is a **reference**, not server authority.

### Migration FAILED / INTERRUPTED

Canonical authority remains **V1** (`canonicalPersistence = v1_local`). V1 local data remains intact. Durable **noncanonical** V2 staging rows (partial Jobs/Applications) **may** exist. Retry with the **same** fingerprint resumes idempotently (equivalent rows skipped). Do **not** interpret failure as “zero durable cloud writes.”

## Invariants

1. `canonicalPersistence` remains `v1_local` until the successful complete+promote path.
2. V1 browser datasets remain intact until (and after) promotion — migration copies, does not delete V1 keys.
3. Same `(accountId, sourceVersion, bundleFingerprint)` retry is supported and must converge when material is equivalent.
4. Existing cloud rows with equivalent material are skipped; divergent material fails closed (`migration_conflict` / session `failed`) without overwrite.
5. Session `completed` and promotion to `v2_cloud` share one DB transaction on the success path.
6. Partial cloud rows are **noncanonical staging** — they must never masquerade as a completed migration or as product source of truth while canonical is still `v1_local`.
7. AF-REL-001: at most one Application per `(accountId, sourceJobId)` when `sourceJobId IS NOT NULL` (DB-enforced).

## Session state machine (authority)

```
(no session)
  → pending
  → importing     // Jobs then Applications; incremental commits
  → failed        // conflicts recorded; canonical stays v1_local
  → completed     // only with atomic promote → v2_cloud

pending | importing | failed  ≠  canonical V2 authority
completed                       ↔  promote path (atomic with v2_cloud)
```

**Response-loss:** if the client loses the HTTP response after the server committed complete+promote, retrying the same fingerprint returns an idempotent completion proof without duplicating rows or opening a second logical migration.

**Completed → importing** is forbidden.

## Non-goals

- All-or-nothing physical storage for every Job/Application create
- Automatic cleanup / GC of abandoned noncanonical staging
- Multi-chunk migration protocol (deferred; ≤50 Jobs / ≤50 Applications per request)
- Exactly-once execution across the network
- Giant single-transaction import of the full bundle

## Consequences

### Positive

- Short DB transactions during import
- Natural crash/retry recovery within the fingerprint session
- Compatible with a future multi-chunk design without changing authority semantics
- Authority never flips early on partial cloud data

### Negative

- Partial cloud rows can exist under `v1_local`
- Operators and UX must understand session/recovery semantics
- Mid-loop `processedJobs` / `processedApplications` are **not** durable progress telemetry (reset on resume; updated on fail/complete) — residual observability debt, outside AF-REL-002 closure
- Abandoned staging may remain until a future cleanup slice

## Alternatives considered

### Giant atomic transaction (rejected)

Validate → create all Jobs → create all Applications → verify → complete → promote inside one `$transaction`.

Rejected because:

- Current bound (≤50/50) makes it *technically* feasible, but it fights the existing resume/skip and response-loss protocol.
- Long transactions increase lock duration and amplify full-retry cost.
- Case study / protocol already chose session-backed resumable import over a single fragile fire-and-forget POST.
- Authority safety is already provided by atomic complete+promote; all-or-nothing storage would not improve the product success definition.

## Partial HTTP read note (AF-REL-003)

Physical staging existence ≠ product readability.

While mode is `v2_offering`, HTTP capability `read` for normal Jobs/Applications product GET routes is **DENY** (`persistence_v2_migration_required`, 403). Noncanonical staging rows may still physically exist under `v1_local`; migration, migration-session GET, and activation remain **ALLOW**. Dashboard product flows treat V1 as source of truth until promotion. Successful canonical promotion (`v2_cloud` → `v2_active` / `v2_read_only`) enables cloud product reads.

Resolved classification: **BLOCK_NONCANONICAL_PRODUCT_READS** (historical R4 label `PRODUCT_CONTRACT_GAP` is closed by AF-REL-003). R4 architecture `OPTION_B_PARTIAL_RESUMABLE` / `AF_REL_002_ACCEPTED_BY_DESIGN` is unchanged.

## References

- Implementation: `apps/applyflow/src/lib/persistence-v2/migration/migration-service.ts`
- Runbook: [PERSISTENCE_V2_MIGRATION_RUNBOOK.md](./PERSISTENCE_V2_MIGRATION_RUNBOOK.md)
- Case study: [PERSISTENCE_V2_CASE_STUDY.md](./PERSISTENCE_V2_CASE_STUDY.md)
