# ADR-004: Enrichment application contract architecture (proposed)

## Status

**Proposed** — architecture and contracts are documented for review. **Not accepted for implementation.** ADR-003 deferral remains in force.

## Context

The provider-derived enrichment lifecycle is **read-only and complete**:

```txt
provider-derived signals → manual review → enrichment proposal
→ transient composition → change preview → handoff/export → lifecycle ends
```

[ADR-002](./ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md) — proposal export remains export-only; import explicitly deferred.

[ADR-003](./ADR-003-PROVIDER-DERIVED-ENRICHMENT-APPLICATION-DEFERRED.md) — enrichment application remains explicitly deferred.

The [application threat model](../career-suite/integrations/PROVIDER-DERIVED-ENRICHMENT-APPLICATION-THREAT-MODEL.md) defines 16 mandatory prerequisites before any mutation. This ADR proposes a **versioned contract architecture** that maps those prerequisites to concrete artifacts — without approving Apply, endpoints, or persistence technology.

Canonical enrichment schema today: `CareerBundleUnifiedSyncEnrichment` in `@devflow/career-sync`, validated by `validateCareerBundleUnifiedSyncEnrichment`. CareerBundle exports are client-local; there is **no persisted bundle identity**, **no revision/ETag**, and **no mutation contract** today.

## Proposed architecture

A future manual apply path would require:

1. **Versioned field allowlist** — `devflow.enrichment-apply-field-allowlist@1` (proposed, not approved)
2. **Mutation request contract** — `devflow.enrichment-apply@1` (proposed, not approved)
3. **Field-level intent model** — per-field operation, fingerprint, consent evidence
4. **Server-issued revision + compare-and-swap** — optimistic concurrency (recommended, not implemented)
5. **Idempotency contract** — server-validated keys with scoped retention
6. **Authorization boundary** — user + tenant + bundle ownership; proposal in browser is not a credential
7. **Server-authoritative validation pipeline** — 15-step sequence documented in contract architecture
8. **Hybrid persistence** — current state + immutable revision/audit records (recommended proposal, not selected)
9. **Audit contract** — `devflow.enrichment-application-audit@1` (proposed)
10. **Rollback via new revision** — no silent history rewrite

Scope limited to `CareerBundle.syncEnrichment` allowlisted fields. `applications[]`, `candidate`, and candidature metadata remain out of scope.

See [PROVIDER-DERIVED-ENRICHMENT-APPLICATION-CONTRACT-ARCHITECTURE.md](../career-suite/integrations/PROVIDER-DERIVED-ENRICHMENT-APPLICATION-CONTRACT-ARCHITECTURE.md) for full detail.

## Decision status

**A contract architecture is proposed for review, but implementation remains prohibited until mandatory gates are approved.**

This ADR does **not**:

- Approve Apply, Save, or mutation endpoints
- Alter ADR-003 (application deferred)
- Alter ADR-002 (export-only; import deferred)
- Select database, ORM, or framework
- Approve any individual allowlist field

## Required gates

All items in the [implementation gate checklist](../career-suite/integrations/PROVIDER-DERIVED-ENRICHMENT-APPLICATION-CONTRACT-ARCHITECTURE.md#28-implementation-gate) must be **Approved** before any mutation code:

| Gate | Status |
|------|--------|
| ADR mutation (implementation) | **Blocked** — requires separate Accepted ADR after this review |
| Allowlist approved | **Pending** |
| Contract version approved | **Proposed** |
| Identity/revision defined | **Open** |
| Persistence model chosen | **Proposed (hybrid)** — not accepted |
| Idempotency defined | **Proposed** |
| Audit contract approved | **Proposed** |
| Rollback approved | **Proposed** |
| AuthZ approved | **Pending** |
| Server validator designed | **Proposed** |
| Consent UX approved | **Pending** |
| Security review | **Pending** |
| Privacy review | **Pending** |
| Test plan approved | **Pending** |

## Consequences

### If architecture is accepted (review only)

- Engineering has objective contracts to evaluate a future apply initiative
- Open decisions are explicit — no implied “coming soon” implementation
- Product boundaries between ApplyFlow, Career Suite packages, and Interview Lab are documented

### Until implementation ADR is Accepted

- No mutation endpoints, repositories, or Apply UI
- Export/handoff remains the lifecycle end state
- All 16 threat-model prerequisites remain blocking

## Security implications

Proposed controls (not implemented):

- Server-authoritative validation; client proposal is not authorization
- Demo and imported sources hard-blocked at server
- Optimistic concurrency prevents stale baseline writes
- Idempotency prevents duplicate application
- Audit fail-closed — mutation not committed if audit fails
- Data minimization — no full proposal, bundle, or provider raw in mutation payload

## Privacy implications

Proposed controls (not implemented):

- Audit stores field names and hashes, not full values when classification suffices
- No provider IDs, tokens, or PII in mutation or audit payloads
- Retention and erasure policies remain open decisions
- Count-only observability; no field content in metrics

## Alternatives considered

| Option | Assessment |
|--------|------------|
| **Skip contract architecture; implement directly** | Rejected — violates ADR-003 prerequisites |
| **Accept architecture and implement immediately** | Rejected — open decisions on identity, allowlist, retention |
| **Propose contracts only (this ADR)** | **Selected** — enables objective gate review without approving Apply |
| **Merge apply with import** | Rejected — ADR-002 keeps import separate |

## Open questions

1. Which allowlist fields (if any) are approved for v1 persistence?
2. Persistent CareerBundle identity model (`bundleId`, owner, tenant)?
3. Final persistence model (hybrid vs event sourcing)?
4. Revision mechanism details (integer vs ETag)?
5. Rollback window and retention periods?
6. Audit retention vs right to erasure?
7. Server-side proposal/session identity format?
8. Consent evidence wire format?

## Relationship with ADR-002

- Export-only proposal lifecycle **unchanged**
- Imported proposal files **not** trusted mutation inputs
- Import workflow remains explicitly deferred and independent of apply

## Relationship with ADR-003

- ADR-003 **Accepted** — application explicitly deferred
- This ADR **Proposed** — supplies contract artifacts for prerequisite review
- ADR-003 reconsideration criteria still require a **separate Accepted ADR** for implementation
- This document does not satisfy ADR-003 prerequisite “dedicated ADR approving mutation contract” — that requires a future **Accepted** implementation ADR

## References

- [PROVIDER-DERIVED-ENRICHMENT-APPLICATION-CONTRACT-ARCHITECTURE.md](../career-suite/integrations/PROVIDER-DERIVED-ENRICHMENT-APPLICATION-CONTRACT-ARCHITECTURE.md)
- [PROVIDER-DERIVED-ENRICHMENT-APPLICATION-THREAT-MODEL.md](../career-suite/integrations/PROVIDER-DERIVED-ENRICHMENT-APPLICATION-THREAT-MODEL.md)
- [ADR-003: Application deferred](./ADR-003-PROVIDER-DERIVED-ENRICHMENT-APPLICATION-DEFERRED.md)
- [ADR-002: Export-only](./ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md)
- [UNIFIED-SYNC-ENRICHMENT-CONTRACT.md](../career-suite/integrations/UNIFIED-SYNC-ENRICHMENT-CONTRACT.md)
