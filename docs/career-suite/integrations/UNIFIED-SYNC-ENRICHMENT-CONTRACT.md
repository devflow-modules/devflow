# Unified Sync Enrichment Contract

`CareerBundleUnifiedSyncEnrichment` has a single canonical TypeScript contract and validator in `@devflow/career-sync`.

The shared validator is consumed by `career-sync`, `career-core`, and ApplyFlow to prevent schema and validation drift. This refactor does not change the enrichment schema, exported proposal format, persistence behavior, or application behavior.

## Ownership and dependency direction

```txt
@devflow/career-sync/unified-sync-enrichment   ← canonical types + validator
        ↓
@devflow/career-core                           ← re-exports + CareerBundle attach adapter
        ↓
apps/applyflow                                 ← proposal + export consumers
```

Rules:

- `career-sync` owns the contract and validator
- `career-core` depends on `career-sync` and re-exports the validator; it does **not** duplicate privacy rules
- `career-sync` does **not** depend on `career-core`
- No circular dependency

## Public API

```ts
validateCareerBundleUnifiedSyncEnrichment(
  value: unknown,
  options?: { expectedSummary?: ProviderDerivedSignalSummary },
): CareerBundleUnifiedSyncEnrichmentValidationResult;
```

Compatibility alias (adapter context):

```ts
validateAdaptedCareerBundleSyncEnrichment(enrichment, expectedSummary?)
```

## Validation policy

| Area | Policy |
|------|--------|
| Root shape | Must be object with `source: "sync"` |
| Extra root fields | Allowed except explicit forbidden keys (`access_token`, `rawPayload`, etc.) |
| Privacy | Critical failures invalidate; `redacted` / `userReviewRequired` drift yields warnings |
| combinedSignals | `rejectProviderIdentifiers: true` rejects `providerId` (adapter/export); default allows legacy demo signals |
| Dates | Must be valid ISO 8601 strings; validator does not mutate values |
| expectedSummary | Optional adapter-only consistency check |

## What this is not

- Not a schema version bump
- Not an import API
- Not a persistence layer
- Not a provider re-fetch mechanism

Legacy Zod structural parsing in `career-core` (`careerBundleSyncEnrichmentSchema`) remains for import parsing; semantic safety uses the canonical validator after structural parse.

## Related docs

- [Provider-Derived Enrichment Adapter](./PROVIDER-DERIVED-ENRICHMENT-ADAPTER.md)
- [Provider-Derived Enrichment Proposal Export](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT.md)
- [Provider-Derived Enrichment Proposal Export Validation](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT-VALIDATION.md)
- [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)
