# Provider-Derived Enrichment Proposal

ApplyFlow can build an ephemeral, review-required enrichment proposal from the provider-derived runtime signals explicitly selected by the user.

The proposal is created locally in memory, is not persisted, is not applied to CareerBundle or applications, does not trigger provider calls, and does not run automatically.

## Status

| Item | State |
|------|--------|
| Provider runtime preview | **Implemented** — see [PROVIDER-DERIVED-RUNTIME-PREVIEW.md](./PROVIDER-DERIVED-RUNTIME-PREVIEW.md) |
| In-memory signal review | **Implemented** — see [PROVIDER-DERIVED-RUNTIME-REVIEW.md](./PROVIDER-DERIVED-RUNTIME-REVIEW.md) |
| Enrichment proposal from selected signals | **Implemented** |
| Local JSON export of ready proposal | **Implemented** — see [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT.md) |
| CareerBundle attach / import / persistence | **Explicitly deferred** — see [lifecycle](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md) |
| Application updates | **Explicitly deferred** |
| Export lifecycle and trust model | **Documented** — [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md) |

Selected and composed signals use runtime-neutral IDs — see [PROVIDER-DERIVED-SIGNAL-ID-CONTRACT.md](./PROVIDER-DERIVED-SIGNAL-ID-CONTRACT.md).

## Flow

```txt
user runs read-only preview
  → user reviews and selects signals
  → user marks selection ready
  → user clicks "Build enrichment proposal"
  → buildProviderDerivedEnrichmentProposal (pure, client-side)
  → ProviderDerivedEnrichmentProposal in React state
  → optional "Download proposal" (local JSON file)
  → no save, no apply, no provider calls
```

## Proposal contract

```ts
type ProviderDerivedEnrichmentProposal = {
  status: "idle" | "ready" | "invalid" | "error";
  sourcePreviewFingerprint: string;
  selectedSignalIds: string[];
  safeForClient: true;
  ephemeral: true;
  userReviewRequired: true;
  persisted: false;
  appliedToCareerBundle: false;
  appliedToApplications: false;
  sourceSignalCount: number;
  generatedAt?: string;
  enrichment?: CareerBundleUnifiedSyncEnrichment;
  warnings: string[];
  messages: string[];
};
```

## Builder

`buildProviderDerivedEnrichmentProposal` validates:

- `reviewStatus === "selection_ready"`
- preview fingerprint matches current preview
- selected IDs exist, are reviewable, and not dismissed
- adapter completes with privacy-safe enrichment

Intermediate composition uses `createSelectedSignalsComposition` (`runtime: "sandbox"` as a **compatibility contract only** — not an assertion of provider origin) and reuses `adaptProviderDerivedSignalsToSyncEnrichment`.

## UI

`ProviderDerivedEnrichmentProposalPanel` — integrated below the review panel in the preview dashboard.

- Button **Build enrichment proposal** enabled only when selection is ready and fingerprint matches
- Shows safe summary: status, counts, companies, privacy flags, warnings, messages
- No Apply, Save, or Export actions

## Reset

Proposal clears when preview, review selection, consent, or connection state changes.

## What this does not do

- Does not persist proposals
- Does not mutate or export CareerBundle
- Does not update applications
- Does not call Gmail, Calendar, Nango, or HTTP routes
- Does not run background sync or LLM processing

## Implementation

| Module | Role |
|--------|------|
| `provider-derived-enrichment-proposal.ts` | Pure proposal builder + validation |
| `provider-derived-enrichment-proposal-panel.tsx` | In-memory proposal UI |
| `provider-derived-runtime-preview-panel.tsx` | Hosts preview + review + proposal |
| `@devflow/career-sync` `createSelectedSignalsComposition` | Intermediate sandbox-compatible composition |

## Export lifecycle

Ready proposals may be downloaded as local JSON. The lifecycle ends at download; ApplyFlow does not import, persist, or re-open exported files. See [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md) and [ADR-002: export-only](../../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md).
