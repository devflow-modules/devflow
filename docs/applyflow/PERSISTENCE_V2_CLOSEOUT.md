# ApplyFlow Persistence V2 — Migration Closeout

**Status:** COMPLETE (first Production pilot active on V2 cloud)  
**Closeout gate:** R2.10  
**Production source SHA (closeout baseline):** `3251cc28b263d6097ba72c631da27d881fee6c15`

This document closes the Persistence V2 **migration implementation**. It does **not** authorize broad rollout or removal of pilot gating.

## Why

V1 `localStorage` limited durability across browsers/devices. Authenticated account persistence enables multi-browser continuity and operational control (pilot revoke, GLOBAL pause) without silent V1 fallback after cutover.

## Architecture

```
Supabase Auth (SSR cookies)
  → Next.js ApplyFlow server routes
  → Prisma
  → dedicated Supabase PostgreSQL (ApplyFlow schema)
```

The browser does **not** query ApplyFlow DB directly. Account identity is server-derived from the session (`auth_provider_sub` → `ApplyFlowAccount`).

## Canonical model

| Value | Meaning |
| --- | --- |
| `v1_local` | Browser is canonical for that account |
| `v2_cloud` | PostgreSQL is canonical for that account |

`pilotEligible` is **independent** of `canonicalPersistence`.

## Effective mode matrix

| GLOBAL | pilotEligible | canonical | mode |
| --- | --- | --- | --- |
| false | false | `v1_local` | `v1` |
| false | true | `v1_local` | `v1` |
| true | false | `v1_local` | `v1` |
| true | true | `v1_local` | `v2_offering` |
| false | false | `v2_cloud` | `v2_paused` |
| false | true | `v2_cloud` | `v2_paused` |
| true | false | `v2_cloud` | `v2_read_only` |
| true | true | `v2_cloud` | `v2_active` |

### One-way boundary

- `canonicalPersistence`: `v1_local` → `v2_cloud` is **one-way**.
- `GLOBAL=false` must **never** mean V1 fallback when `canonical=v2_cloud` (→ `v2_paused`).
- Pilot revoke must **never** mean V1 fallback when `canonical=v2_cloud` (→ `v2_read_only`).

## Migration safety

**Non-empty V1**

1. Browser bundle → deterministic fingerprint  
2. Durable migration session  
3. Chunked server import  
4. Completion proof  
5. Canonical promotion to `v2_cloud`

**Empty V1**

1. Explicit empty activation  
2. Server empty-state proof  
3. Completed audit `ApplyFlowMigrationSession`  
4. Canonical promotion to `v2_cloud`

After `canonical=v2_cloud`, retained local data may exist as backup/cache but is **never** authoritative fallback.

## Concurrency (PATCH)

- Transport: JSON body `expectedVersion` (positive integer)  
- Success: **2xx**, version advances  
- Stale: **409** `version_conflict`, no mutation  
- Response `ETag`: informational only  
- HTTP `If-Match`: **not** the ApplyFlow concurrency transport  

During Production validation (R2.8), `If-Match` could surface Vercel `412 PRECONDITION_FAILED` while the origin still committed — observed ApplyFlow Production behavior, not claimed as universal Vercel policy.

## Operational safety

Protected local operator CLI (`apps/applyflow`):

- `pnpm pilot:status|grant|revoke`
- Target-bound `--confirm` token
- Production: `--production --confirm-production 3c193d95207920e0`
- Mutates **only** `pilotEligible` (never `canonicalPersistence`)

Recovery target for the first pilot:

`GLOBAL=true` + `pilotEligible=true` + `canonicalPersistence=v2_cloud` → `v2_active`

## Production validation trail (no secrets)

| Gate | Decision |
| --- | --- |
| R2.5 | `R2_5_FIRST_PILOT_STAGED_GLOBAL_OFF` |
| R2.6 | `R2_6_FIRST_PILOT_OFFERING_READY` |
| R2.7 | `R2_7_FIRST_PRODUCTION_EMPTY_ACTIVATION_COMPLETE` |
| R2.8 | `R2_8_V2_CLOUD_CRUD_DURABILITY_COMPLETE` |
| R2.8.1 | `R2_8_1_PATCH_CONCURRENCY_CONTRACT_FIXED` |
| R2.9 | `R2_9_V2_READ_ONLY_AND_KILL_SWITCH_VALIDATED` |
| R2.10 | `R2_10_PERSISTENCE_V2_MIGRATION_COMPLETE` |

## Final state (first pilot)

- `GLOBAL=true`
- `pilotEligible=true`
- `canonicalPersistence=v2_cloud`
- `effectiveMode=v2_active`
- Canonical source: **PostgreSQL / V2 cloud**
- V1 localStorage: **non-canonical for this account**
- Safety controls: **validated**
- Broad rollout / pilot-gate removal: **out of scope** (separate product decision)

## References

- [`PERSISTENCE_V2_CASE_STUDY.md`](./PERSISTENCE_V2_CASE_STUDY.md) — engineering case study (portfolio / maintainers)
- [`PERSISTENCE_V2.md`](./PERSISTENCE_V2.md)
- [`PERSISTENCE_V2_FIRST_PRODUCTION_PILOT_RUNBOOK.md`](./PERSISTENCE_V2_FIRST_PRODUCTION_PILOT_RUNBOOK.md)
- [`PERSISTENCE_V2_MIGRATION_RUNBOOK.md`](./PERSISTENCE_V2_MIGRATION_RUNBOOK.md)
- [`ADR-PERSISTENCE_V2_LOCAL_AND_CLOUD.md`](./ADR-PERSISTENCE_V2_LOCAL_AND_CLOUD.md)
