# Provider-Derived Runtime Review

ApplyFlow includes an in-memory review workflow for client-safe signals produced by the explicitly triggered provider runtime preview.

Users can select or dismiss derived signals locally before any future explicit action. The review state is not persisted, does not modify CareerBundle or applications, and does not trigger provider calls or background processing.

## Status

| Item | State |
|------|--------|
| Provider runtime preview | **Implemented** — see [PROVIDER-DERIVED-RUNTIME-PREVIEW.md](./PROVIDER-DERIVED-RUNTIME-PREVIEW.md) |
| In-memory signal review workflow | **Implemented** |
| CareerBundle enrichment from review | **Not implemented** |
| Application updates from review | **Not implemented** |
| Persistence of review decisions | **Not implemented** |

## Flow

```txt
user runs read-only preview
  → client-safe ProviderDerivedSignal[] returned
  → review panel initializes in-memory state
  → user selects or dismisses signals
  → optional "Mark selection ready"
  → optional "Build enrichment proposal" (see [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL.md))
  → optional "Download proposal" (see [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT.md))
  → no save, no apply, no provider calls
```

## Review state

```ts
type ProviderDerivedRuntimeReviewState = {
  sourcePreviewFingerprint: string | null;
  selectedSignalIds: string[];
  dismissedSignalIds: string[];
  reviewStatus: "idle" | "reviewing" | "selection_ready";
};
```

Only signal IDs are stored in review state. Signals come from the current preview result.

## Fingerprint

`createProviderDerivedPreviewFingerprint` builds a deterministic string from:

- preview `status`
- `processedMessageCount` / `processedEventCount`
- signal `id`, `source`, `kind`, `occurredAt`, `startsAt`

A new preview with a different fingerprint resets review state.

## Reviewable signals

A signal is reviewable when:

- it exists in the current preview
- `isProviderDerivedSignalReviewable` passes (valid ID, source, kind, occurredAt, confidence, `reviewRequired: true`)

## UI

`ProviderDerivedRuntimeReviewPanel` — integrated below the preview panel.

Actions:

- Select all (reviewable, non-dismissed)
- Clear selection
- Dismiss / Restore per signal
- Mark selection ready (requires at least one selected signal)

Badges: In-memory only, Manual review, No automatic changes.

## Reset

Review clears when:

- preview loading starts
- preview returns blocked or error
- preview fingerprint changes
- parent clears preview on consent or connection changes

## What this does not do

- Does not persist review state (no localStorage, sessionStorage, database)
- Does not call Gmail, Calendar, or Nango
- Does not mutate or export CareerBundle
- Does not update applications
- Does not run background sync or LLM processing

## Implementation

| Module | Role |
|--------|------|
| `provider-derived-runtime-review-state.ts` | Pure review state + fingerprint helpers |
| `provider-derived-runtime-review-panel.tsx` | Review UI (in-memory React state) |
| `provider-derived-runtime-signal-card.tsx` | Per-signal safe display + actions |
| `provider-derived-runtime-preview-panel.tsx` | Hosts preview + review integration |
