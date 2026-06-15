# Provider-Derived Enrichment Proposal Export

ApplyFlow can export a ready provider-derived enrichment proposal as a local JSON file after explicit user review.

The file is generated in the browser, is not uploaded or retained by ApplyFlow, does not modify CareerBundle or applications, does not trigger provider calls or background processing, and is **not** an importable CareerBundle artifact.

## Status

| Item | State |
|------|--------|
| Enrichment proposal (in-memory) | **Implemented** — see [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL.md) |
| Local JSON export | **Implemented** |
| Import / apply / persistence | **Not implemented** |

## Flow

```txt
ready enrichment proposal
  → user clicks "Download proposal"
  → buildProviderDerivedEnrichmentProposalExport (pure)
  → browser Blob + anchor download
  → file saved locally by the user
  → no upload, no ApplyFlow persistence
```

## Export document (version 1)

```ts
type ProviderDerivedEnrichmentProposalExport = {
  schema: "devflow.provider-derived-enrichment-proposal";
  version: 1;
  exportedAt: string; // ISO 8601, set at explicit download click
  generatedAt: string; // ISO 8601, copied from the in-memory proposal
  sourceSignalCount: number;
  reviewRequired: true;
  persistedByApplyFlow: false;
  appliedToCareerBundle: false;
  appliedToApplications: false;
  enrichment: CareerBundleUnifiedSyncEnrichment;
};
```

This is **not** a full CareerBundle export. No import compatibility is promised in this release.

### Schema versioning policy

- `schema` and `version` are fixed literals in version 1.
- Incompatible document changes require a new `version`.
- New optional top-level fields require explicit contract review.
- Import, apply, and server-side persistence remain out of scope.

## Fields intentionally excluded

The export envelope does **not** include UI-only or session-local fields from the in-memory proposal:

| Field | Reason excluded |
|-------|-----------------|
| `sourcePreviewFingerprint` | Staleness control for the review UI only; no independent validation meaning |
| `selectedSignalIds` | Review selection state only; `sourceSignalCount` is sufficient for the exported document |

### Technical debt: internal signal IDs in enrichment

`enrichment.combinedSignals[].id` may still use deterministic internal IDs produced by the sandbox classifier (e.g. `gmail-sandbox-*`, `calendar-sandbox-*`) even when the runtime preview uses real provider data. Those prefixes describe the **ID builder**, not proof of sandbox runtime origin, and must not be interpreted as Gmail/Calendar/Nango provider identifiers. Runtime ID builders for real provider data are tracked separately; this PR does not change enrichment ID semantics.

## Filename

`devflow-enrichment-proposal-{exportedAt-sanitized}.json` — colons and dots in `exportedAt` become hyphens. No spaces, slashes, company names, emails, signal IDs, or fingerprints.

## Serialization guarantees

- Top-level fields are allowlisted and serialized in a fixed order.
- Enrichment is rebuilt field-by-field; no `JSON.stringify(proposal)` or unrestricted spreads.
- `companyHints` are sorted alphabetically for deterministic output.
- JSON uses 2-space indentation and a trailing newline.
- `assertExportJsonSafe` recursively rejects forbidden keys (defense in depth).

## What this does not do

- Does not upload files
- Does not persist export state in ApplyFlow
- Does not import or apply to CareerBundle
- Does not update applications
- Does not call providers or HTTP routes

## Implementation

| Module | Role |
|--------|------|
| `provider-derived-enrichment-proposal-export.ts` | Pure export builder + allowlist serialization |
| `provider-derived-enrichment-proposal-download.ts` | Browser download helper (Blob + object URL + revoke in `finally`) |
| `provider-derived-enrichment-proposal-panel.tsx` | Download button + local status |

## Validation note

Export reuses `validateAdaptedCareerBundleSyncEnrichment` from `@devflow/career-sync`. That validator mirrors career-core privacy rules but may diverge over time; structural allowlisting in the export builder remains the primary safety boundary.
