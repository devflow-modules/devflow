# Provider-Derived Enrichment Proposal Export Validation

The version 1 provider-derived enrichment proposal export has a standalone, pure validator in `@devflow/career-sync`.

The validator checks the strict document envelope, schema, version, canonical timestamps, fixed safety flags, prohibited keys and the canonical unified sync enrichment contract. It does not read files, import data, persist anything, sanitize payloads or apply changes to CareerBundle or applications.

## Ownership

The export document contract lives in `@devflow/career-sync` (`packages/career-sync/src/provider-derived-enrichment-export/`) because:

- The enrichment payload is already owned by `career-sync`.
- The validator must be reusable without ApplyFlow UI or browser APIs.
- ApplyFlow remains the browser-only builder/downloader; it imports the canonical type and validators from the package.

ApplyFlow re-exports document constants and types from `@devflow/career-sync` for backward compatibility.

## Public API

```ts
validateProviderDerivedEnrichmentProposalExportV1(value: unknown)
validateProviderDerivedEnrichmentProposalExport(value: unknown) // schema/version dispatch only
```

Result shape:

```ts
type ProviderDerivedEnrichmentProposalExportValidationResult =
  | { valid: true; value: ProviderDerivedEnrichmentProposalExport; warnings: string[]; errors: [] }
  | { valid: false; warnings: string[]; errors: string[] };
```

## What the validator checks

| Layer | Policy |
|-------|--------|
| Root | Strict allowlist of 10 fields; extras → `unexpected_root_field:<key>` |
| Schema | Exactly `devflow.provider-derived-enrichment-proposal` |
| Version | Exactly `1` (number); unknown versions → `unsupported_version` |
| Timestamps | `exportedAt` / `generatedAt` must round-trip `new Date(v).toISOString() === v` |
| Count | `sourceSignalCount` integer ≥ 1 |
| Flags | `reviewRequired === true`; `persistedByApplyFlow`, `appliedToCareerBundle`, `appliedToApplications` === `false` |
| Forbidden keys | Recursive scan for credential/provider/raw keys → `forbidden_key:<name>` |
| Enrichment | `validateCareerBundleUnifiedSyncEnrichment(..., { rejectProviderIdentifiers: true })` |

## What the validator does **not** do

- Not an importer — no file picker, `FileReader`, drag-and-drop or upload
- Does not read files or parse blobs
- Does not sanitize, normalize or strip fields
- Does not persist to storage (local or server)
- Does not apply changes to CareerBundle or applications
- Does not guarantee forward compatibility — version 1 is validated explicitly; unknown versions are rejected

Validation does not sanitize the document; cross-boundary consumers must still serialize by allowlist.

## ApplyFlow integration

`buildProviderDerivedEnrichmentProposalExport` validates the in-memory proposal, builds the allowlisted document, runs `validateProviderDerivedEnrichmentProposalExportV1`, then serializes with the existing fixed-order allowlist. The validator complements — it does not replace — structural serialization allowlisting.

## Lifecycle context

Validation confirms structural conformance for inspection and programmatic audit. It does **not** prove authorship, enable import, or authorize CareerBundle or application mutation. See [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md) (sections 4, 6, 14) and [ADR-002: export-only](../../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md).

## Related docs

- [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT.md)
- [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md)
- [UNIFIED-SYNC-ENRICHMENT-CONTRACT.md](./UNIFIED-SYNC-ENRICHMENT-CONTRACT.md)
- [SYNC-DATA-BOUNDARIES.md](./SYNC-DATA-BOUNDARIES.md)
- [ADR-002: export-only](../../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md)
