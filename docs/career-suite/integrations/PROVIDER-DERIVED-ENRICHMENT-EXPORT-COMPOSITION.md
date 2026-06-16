# Provider-Derived Enrichment Export Composition

Read-only, transient composition of validated provider-derived `syncEnrichment` into the dashboard CareerBundle export preview shape.

Nothing is applied, persisted, imported, or downloaded automatically.

## Status

| Item | State |
|------|--------|
| Provider-derived enrichment export composition | **Implemented** — ApplyFlow dashboard export preview |
| Enrichment apply workflow | **Explicitly deferred** — [ADR-003](../../adr/ADR-003-PROVIDER-DERIVED-ENRICHMENT-APPLICATION-DEFERRED.md) |
| Import workflow | **Explicitly deferred** — [ADR-002](../../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md) |

## Purpose

When a ready `ProviderDerivedEnrichmentProposal` exists in the current session, its validated `enrichment` may participate in the **same** transient export shape used for:

- CareerBundle export preview (copy, handoff, JSON download)
- enrichment change preview baseline

This closes the gap where provider-derived enrichment lived only in the proposal flow while export used demo or no enrichment.

## Source ownership

| Layer | Module |
|-------|--------|
| Proposal contracts / staleness | `@devflow/career-sync` + ApplyFlow `provider-derived-enrichment-proposal` |
| Bundle composition | `@devflow/career-core` `composeCareerBundleExportWithSyncEnrichment` |
| Eligibility + source policy | ApplyFlow `deriveEligibleProviderEnrichmentForExport`, `resolveCareerBundleSyncEnrichmentSource` |
| Session wiring | ApplyFlow `dashboard-client` + provider runtime panels |

`career-sync` does **not** depend on `career-core`.

## Proposal eligibility

`deriveEligibleProviderEnrichmentForExport` returns `CareerBundleUnifiedSyncEnrichment | null` only when:

- proposal exists and is not stale (`isEnrichmentProposalStale`)
- `proposal.status === "ready"` and `proposal.enrichment` is present
- safety flags: `persisted === false`, `appliedToCareerBundle === false`, `appliedToApplications === false`, `userReviewRequired === true`
- `selectedSignalIds.length > 0`
- enrichment passes `validateCareerBundleSyncEnrichment`

Absence is supported; not an error.

## Proposal invalidation

Stale proposals are excluded from composition when:

- preview is loading or missing / blocked / error
- review is not `selection_ready`
- preview fingerprint mismatch
- selected signal IDs changed

Runtime panel clears in-memory proposal and reports `null` eligible enrichment upstream.

## Source precedence (mutually exclusive)

```txt
provider-derived-proposal (eligible) > demo > none
```

| Source | When |
|--------|------|
| `provider-derived-proposal` | Eligible ready proposal enrichment in session |
| `demo` | `includeDemoSyncEnrichment` checkbox enabled, no eligible provider enrichment |
| `none` | No eligible enrichment |

Demo and provider-derived enrichment are **never merged**.

## Composition semantics

```txt
applications
  → buildInterviewLabCareerBundle (base)
  → composeCareerBundleExportWithSyncEnrichment (provider-derived)
     or createCareerBundleWithSyncEnrichment (demo)
  → canonical parse + validate
  → extractCareerBundleSyncEnrichment (baseline)
```

Creates new objects only. Does not mutate applications, candidate, or proposal.

## Export semantics

- Export occurs **only** through existing explicit user actions (copy, handoff, download button).
- No auto-export when proposal becomes ready.
- No background download or persistence.

## Change preview consistency

`deriveDashboardCareerBundleExportComposition` is the single policy for:

- `exportComposition.source` / `syncEnrichment`
- change preview `currentSyncEnrichment` and `baselineSourceKind`

## Data minimization

Only `CareerBundleUnifiedSyncEnrichment | null` crosses the export composition boundary.

Not propagated: full proposal, `selectedSignalIds`, fingerprints, review state, provider raw payloads, tokens, connection IDs.

## Privacy invariants

- Reuses `validateCareerBundleSyncEnrichment` and proposal staleness checks
- No `JSON.stringify(proposal)` in composition path
- ADR-002 unchanged (export-only lifecycle)

## Non-goals

- Apply / Save / import / upload / persistence
- CareerBundle or application mutation
- New routes or write endpoints

## Related docs

- [PROVIDER-DERIVED-EXPORT-HANDOFF-VALIDATION.md](./PROVIDER-DERIVED-EXPORT-HANDOFF-VALIDATION.md)
- [PROVIDER-DERIVED-ENRICHMENT-APPLICATION-THREAT-MODEL.md](./PROVIDER-DERIVED-ENRICHMENT-APPLICATION-THREAT-MODEL.md)
- [ADR-003](../../adr/ADR-003-PROVIDER-DERIVED-ENRICHMENT-APPLICATION-DEFERRED.md)
- [PROVIDER-DERIVED-ENRICHMENT-CHANGE-PREVIEW.md](./PROVIDER-DERIVED-ENRICHMENT-CHANGE-PREVIEW.md)
- [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL.md)
- [ADR-002](../../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md)
