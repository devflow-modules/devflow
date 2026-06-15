# Provider-Derived Enrichment Proposal Export

ApplyFlow can export a ready provider-derived enrichment proposal as a local JSON file after explicit user review.

The file is generated in the browser, is not uploaded or retained by ApplyFlow, does not modify CareerBundle or applications, and does not trigger provider calls or background processing.

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

## Export document

```ts
type ProviderDerivedEnrichmentProposalExport = {
  schema: "devflow.provider-derived-enrichment-proposal";
  version: 1;
  exportedAt: string;
  generatedAt: string;
  sourcePreviewFingerprint: string;
  selectedSignalIds: string[]; // deterministic internal IDs only
  sourceSignalCount: number;
  reviewRequired: true;
  persistedByApplyFlow: false;
  appliedToCareerBundle: false;
  appliedToApplications: false;
  enrichment: CareerBundleUnifiedSyncEnrichment;
};
```

This is **not** a full CareerBundle export.

## selectedSignalIds

Only deterministic internal derived signal IDs (e.g. `gmail-sandbox-*`, `calendar-sandbox-*`) are exported after `isSelectedSignalIdSafeForExport` validation. Provider message/event/thread/calendar IDs are rejected.

## Filename

`devflow-enrichment-proposal-{exportedAt-sanitized}.json` — no spaces, colons, slashes, company names, or emails.

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
| `provider-derived-enrichment-proposal-download.ts` | Browser download helper (Blob + object URL) |
| `provider-derived-enrichment-proposal-panel.tsx` | Download button + local status |
