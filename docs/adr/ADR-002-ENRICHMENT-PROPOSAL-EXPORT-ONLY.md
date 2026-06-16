# ADR-002: Keep provider-derived enrichment proposal v1 export-only

## Status

Accepted

## Context

ApplyFlow already implements a full provider-derived enrichment path:

- **Preview** — opt-in read-only derived signals from Gmail/Calendar runtime composition
- **Review** — in-memory signal selection and dismiss
- **Proposal** — ephemeral `CareerBundleUnifiedSyncEnrichment` built from selected signals
- **Export** — browser-side JSON download of a version 1 document (`devflow.provider-derived-enrichment-proposal`)
- **Validator** — standalone `validateProviderDerivedEnrichmentProposalExportV1` in `@devflow/career-sync`

Technically, the stack could evolve to parse downloaded files back into ApplyFlow, attach enrichment to CareerBundle, or update applications. That would expand the trust boundary and introduce a new mutation surface: file contents could be hand-edited, replayed, or synthesized outside the product.

The export was designed as a **human-auditable snapshot** — evidence of a proposal the user explicitly reviewed — not as an import payload, sync command, or write API.

## Decision

Keep version 1 **export-only**:

- No parser for external proposal files in ApplyFlow
- No importer, file picker, or upload route
- No CareerBundle or application mutation from the export artifact
- No background processing of downloaded files
- No cryptographic signature or integrity hash in v1

The lifecycle ends at browser download. Validation confirms document shape for inspection and programmatic audit; it does not authorize apply or import.

## Consequences

### Positive

- Smaller attack surface — no untrusted file ingestion in the product
- Simple, strict contract — ten top-level fields, fixed safety flags
- No provenance ambiguity — product does not claim files are authentic
- No migration burden for import paths across versions
- No mutation risk from replayed or tampered JSON
- Audit value preserved — users can still inspect and archive proposals offline
- Disciplined roadmap — next initiatives do not assume import exists

### Negative

- Downloaded files cannot be reopened inside ApplyFlow
- Users cannot recover in-product state from a saved export alone
- No automated interoperability with other tools via this format

### Deferred

- Parser and import workflow
- Signature or integrity hash
- CareerBundle attach from proposal file
- Application updates from proposal file
- Server-side persistence of exports

## Reconsideration triggers

Revisit this decision when a **separate** product requirement and threat model exist, including at minimum:

- Proven real use case with clear user or business benefit
- Isolated parser with size/depth limits and prototype pollution protection
- Version policy and migration between versions
- Provenance model and idempotency rules
- Change preview, explicit user confirmation, rollback, and audit trail
- Commitment to **no automatic application**

Until then, version 1 remains a local, human-auditable artifact only.

## References

- [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md](../career-suite/integrations/PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md)
- [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT.md](../career-suite/integrations/PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT.md)
- [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT-VALIDATION.md](../career-suite/integrations/PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT-VALIDATION.md)
- [SYNC-DATA-BOUNDARIES.md](../career-suite/integrations/SYNC-DATA-BOUNDARIES.md)
