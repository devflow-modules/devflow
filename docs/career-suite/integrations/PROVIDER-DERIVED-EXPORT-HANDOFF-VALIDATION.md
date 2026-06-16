# Provider-Derived Export Handoff Validation

Read-only validation that dashboard export composition, change preview, Interview Lab handoff, and explicit download share the same transient CareerBundle shape and enrichment source policy.

## Status

| Item | State |
|------|--------|
| Export source visibility | **Implemented** — dashboard UI badge + description |
| Interview Lab handoff validation | **Implemented** — integration tests on postMessage payload |
| Enrichment apply workflow | **Explicitly deferred** — [ADR-003](../../adr/ADR-003-PROVIDER-DERIVED-ENRICHMENT-APPLICATION-DEFERRED.md) |
| Application threat model | **Documented** — [PROVIDER-DERIVED-ENRICHMENT-APPLICATION-THREAT-MODEL.md](./PROVIDER-DERIVED-ENRICHMENT-APPLICATION-THREAT-MODEL.md) |
| Import workflow | **Explicitly deferred** — [ADR-002](../../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md) |

## Purpose

Make the active composition source (`none` / `demo` / `provider-derived-proposal`) visible and auditable, and prove that preview, change preview, handoff, copy, and download all use the same canonical bundle from `deriveDashboardCareerBundleExportComposition`.

## Source visibility

UI derives labels from `exportComposition.sourceKind` only via `deriveExportCompositionSourceViewModel`:

| Source | Label | Description |
|--------|-------|-------------|
| `none` | Sem enrichment | Nenhum enrichment na composição atual |
| `demo` | Demonstrativo | Dados demonstrativos apenas |
| `provider-derived-proposal` | Provider-derived | Dados dos sinais revisados nesta sessão |

No content-based inference. No proposal or bundle passed to the view model.

## Single composition policy

```txt
deriveDashboardCareerBundleExportComposition
  → source + sourceKind + syncEnrichment + bundle (canonical)
  → buildExportCareerBundle returns composition.bundle
  → copy / handoff / download / change preview baseline
```

## Preview consistency

- Dashboard: `DashboardCareerExportCompositionSource` shows `sourceKind`
- Change preview: `baselineSourceKind` from same `exportComposition.sourceKind`
- Both read from one `useMemo` composition — no UI-side policy recalculation

## Interview Lab handoff

Mechanism (unchanged):

```txt
sendCareerBundleViaPostMessageWithRetry
  → createCareerBundleHandshakeMessage(bundle)
  → window.postMessage to Interview Lab origin
  → ACK or clipboard fallback
```

Handoff receives validated `CareerBundle` / `CareerBundleWithSyncEnrichment` only — not proposal, review state, or provider raw.

## Export consistency

`stringifyInterviewLabCareerBundleExport(composition.bundle)` is identical for handoff payload serialization and download/copy paths when using the canonical bundle reference.

Tests normalize structural equality without comparing volatile `exportedAt`.

## Stale proposal behavior

When proposal becomes stale, `eligibleProviderEnrichment` becomes `null`, `sourceKind` falls back to `demo` or `none`, and UI badge updates from the same composition memo.

## Explicit action requirement

- Source visibility does not trigger download
- Proposal ready does not trigger handoff
- Handoff does not trigger download
- All actions remain separate explicit buttons

## Test strategy

| Layer | Coverage |
|-------|----------|
| View model | `derive-export-composition-source-view-model.test.ts` |
| UI | `dashboard-career-export-composition-source.test.tsx` |
| Session consistency | `career-bundle-export-session-consistency.test.ts` |
| Handoff adapter | `career-bundle-postmessage-handoff.test.ts` (sync enrichment payload) |

No Playwright E2E in ApplyFlow today — integration tests at lib/component level document the limitation.

## Privacy invariants

- View model accepts `sourceKind` only
- Handoff payload validated with `parseCareerBundleWithSyncEnrichment`
- No `selectedSignalIds`, fingerprints, or proposal metadata in postMessage

## Non-goals

- Apply / Save / import / persistence
- New handoff mechanism
- CareerBundle schema changes for source metadata

## Related docs

- [PROVIDER-DERIVED-ENRICHMENT-EXPORT-COMPOSITION.md](./PROVIDER-DERIVED-ENRICHMENT-EXPORT-COMPOSITION.md)
- [PROVIDER-DERIVED-ENRICHMENT-CHANGE-PREVIEW.md](./PROVIDER-DERIVED-ENRICHMENT-CHANGE-PREVIEW.md)
- [ADR-002](../../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md)

## Read-only lifecycle

Export composition → explicit handoff or download → lifecycle ends. No server persistence. Application is explicitly deferred ([ADR-003](../../adr/ADR-003-PROVIDER-DERIVED-ENRICHMENT-APPLICATION-DEFERRED.md)). ADR-002 export-only remains in force.
