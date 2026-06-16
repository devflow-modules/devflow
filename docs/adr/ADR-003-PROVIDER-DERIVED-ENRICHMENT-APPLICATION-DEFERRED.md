# ADR-003: Provider-derived enrichment application remains explicitly deferred

## Status

Accepted

## Context

The Career Suite provider-derived path is **read-only and complete** through export composition, source visibility, change preview, and Interview Lab handoff:

```txt
provider metadata → derived signals → runtime preview → manual review
→ enrichment proposal → eligibility → transient composition
→ change preview → explicit export/handoff → lifecycle ends
```

Safety flags on in-memory proposals and v1 export documents require:

- `persisted: false` / `persistedByApplyFlow: false`
- `appliedToCareerBundle: false`
- `appliedToApplications: false`
- `userReviewRequired: true`

[ADR-002](./ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md) keeps proposal **export-only**; import remains explicitly deferred.

A future workflow could allow a user to **manually** persist reviewed provider-derived enrichment into allowlisted `CareerBundle.syncEnrichment` fields. That would cross a new trust boundary (`proposal → mutation`) with material security, privacy, concurrency, audit, and rollback requirements.

The threat model [PROVIDER-DERIVED-ENRICHMENT-APPLICATION-THREAT-MODEL.md](../career-suite/integrations/PROVIDER-DERIVED-ENRICHMENT-APPLICATION-THREAT-MODEL.md) analyzes risks and prerequisites. It is **not** an implementation specification and does **not** approve Apply.

Candidate contracts and architectural gates are proposed in [PROVIDER-DERIVED-ENRICHMENT-APPLICATION-CONTRACT-ARCHITECTURE.md](../career-suite/integrations/PROVIDER-DERIVED-ENRICHMENT-APPLICATION-CONTRACT-ARCHITECTURE.md) and [ADR-004](./ADR-004-ENRICHMENT-APPLICATION-CONTRACT-ARCHITECTURE-PROPOSED.md) (Status: **Proposed**). These do **not** approve implementation.

## Decision

**Provider-derived enrichment application remains explicitly deferred.**

Export-only behavior remains the current product lifecycle. No Apply, Save, mutation endpoint, persistence layer, or field-level apply UI is approved by this ADR.

Implementation may proceed **only after**:

1. All mandatory prerequisites in the threat model are satisfied
2. A **dedicated ADR** approves a versioned mutation contract, allowlist, and persistence model
3. Privacy and security review sign-off

## Rationale

- The read-only lifecycle intentionally minimizes attack surface (no untrusted import, no client-authoritative writes).
- Applying enrichment requires server-authoritative validation, optimistic concurrency, idempotency, field-level consent, audit trail, and rollback — none of which exist today.
- Demo enrichment, stale proposals, tampered exports, and cross-session replay are high-severity abuse cases if application were enabled prematurely.
- Application to `applications[]` or candidate data is out of scope and would require separate threat modeling.

## Consequences

### Positive

- Clear product boundary — users and engineers know export/handoff is the end state
- No premature mutation surface or ambiguous “attach/sync” language in the codebase
- Threat model and prerequisites provide a disciplined path if the product later needs apply
- ADR-002 and read-only invariants remain coherent

### Negative

- Users cannot persist provider-derived enrichment inside ApplyFlow today
- Product must continue manual export/handoff workflows for Interview Lab and offline audit
- Future apply work has a high bar (multiple ADRs, server boundary, UX for per-field consent)

## Security implications

Until reconsideration:

- Client-held proposals must not authorize writes
- Exported proposal files must not become trusted mutation inputs ([ADR-002](./ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md))
- Demo data must never be persistable as real enrichment
- Provider raw, tokens, and connection identifiers must not enter mutation or audit payloads

A future apply path must fail closed on validation, authorization, staleness, or audit errors.

## Reconsideration criteria

Reopen only when **all** are true:

- Documented product requirement with user benefit and scope limited to `CareerBundle.syncEnrichment` allowlist
- Threat model prerequisites checklist completed (see threat model §26)
- Dedicated ADR for mutation contract version, persistence model, and rollback
- Server-authoritative validator and authorization policy implemented in a separate approved initiative
- Field-level consent UX reviewed for privacy
- Integration and security tests for stale proposal, replay, tamper, and demo hard-block
- Import workflow remains a **separate** decision ([ADR-002](./ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md))

Automatic or batch application (decision matrix option D) is **incompatible** with current invariants and is not a reconsideration target.

## Alternatives considered

| Option | Assessment |
|--------|------------|
| **A — Keep export-only** | **Current decision** — lowest risk, lifecycle complete |
| **B — Field-by-field manual apply** | Possible future path only after prerequisites; highest UX clarity |
| **C — Batch apply of reviewed set** | Higher conflict and consent risk; defer until B is proven |
| **D — Automatic apply** | Rejected — incompatible with `userReviewRequired`, stale protection, and trust model |

## References

- [PROVIDER-DERIVED-ENRICHMENT-APPLICATION-CONTRACT-ARCHITECTURE.md](../career-suite/integrations/PROVIDER-DERIVED-ENRICHMENT-APPLICATION-CONTRACT-ARCHITECTURE.md)
- [ADR-004: Contract architecture proposed](./ADR-004-ENRICHMENT-APPLICATION-CONTRACT-ARCHITECTURE-PROPOSED.md)
- [PROVIDER-DERIVED-ENRICHMENT-APPLICATION-THREAT-MODEL.md](../career-suite/integrations/PROVIDER-DERIVED-ENRICHMENT-APPLICATION-THREAT-MODEL.md)
- [ADR-002: Enrichment proposal export-only](./ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md)
- [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md](../career-suite/integrations/PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md)
- [PROVIDER-DERIVED-ENRICHMENT-EXPORT-COMPOSITION.md](../career-suite/integrations/PROVIDER-DERIVED-ENRICHMENT-EXPORT-COMPOSITION.md)
- [PROVIDER-DERIVED-EXPORT-HANDOFF-VALIDATION.md](../career-suite/integrations/PROVIDER-DERIVED-ENRICHMENT-EXPORT-HANDOFF-VALIDATION.md)
