# Provider-Derived Enrichment Change Preview

Read-only, deterministic comparison between the current `CareerBundle` sync enrichment (if any) and a provider-derived enrichment proposal **before** local export.

Nothing is applied, persisted, imported, or sent to providers.

## Status

| Item | State |
|------|--------|
| Enrichment change preview | **Implemented** — ApplyFlow proposal flow |
| Current CareerBundle enrichment wiring | **Implemented** — optional dashboard baseline via `extractCareerBundleSyncEnrichment` |
| Provider-derived enrichment export composition | **Implemented** — transient export preview from eligible proposals |
| Enrichment apply workflow | **Explicitly deferred** — requires separate ADR and threat model |
| Import workflow | **Explicitly deferred** — [ADR-002](../../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md) |

## Purpose

Allow users to compare **current value vs. suggested value** for allowlisted sync enrichment fields after building a ready proposal — without mutating CareerBundle or applications.

The preview is transient, client-safe, and audit-friendly. The export lifecycle still ends at browser download.

## Inputs

| Input | Source |
|-------|--------|
| `current` | Optional validated `CareerBundle.syncEnrichment` from the dashboard export shape (`deriveDashboardCareerBundleSyncEnrichmentBaseline` → `extractCareerBundleSyncEnrichment`); `null` when absent or invalid |
| `proposed` | `ProviderDerivedEnrichmentProposal.enrichment` when status is `ready` |
| `excludedSignalIds` | Dismissed signal IDs from manual review |

## Outputs

`EnrichmentChangePreviewResult` from `@devflow/career-sync`:

- `items[]` — per-field comparison with `currentValue` / `suggestedValue` as `SafeDisplayValue`
- `statusCounts` — aggregate counts per preview status
- Safety flags: `readOnly: true`, `appliedToCareerBundle: false`, `appliedToApplications: false`, `persisted: false`

## Ownership

| Layer | Module |
|-------|--------|
| Domain comparison | `@devflow/career-sync` `enrichment-change-preview/` |
| CareerBundle adapter | `@devflow/career-core` `deriveCareerBundleEnrichmentChangePreview`, `extractCareerBundleSyncEnrichment` |
| Dashboard baseline selection | ApplyFlow `deriveDashboardCareerBundleSyncEnrichmentBaseline` |
| UI view model + panel | ApplyFlow `provider-derived-enrichment-change-preview*` |

`career-sync` does **not** depend on `career-core`.

## Optional current baseline (dashboard)

The provider runtime does **not** import or persist a CareerBundle file. When the dashboard has in-memory applications, ApplyFlow builds the same export shape used for Interview Lab handoff (`buildInterviewLabCareerBundleForExport`) and extracts only validated `syncEnrichment`:

```txt
dashboard applications + includeDemoSyncEnrichment
  → buildInterviewLabCareerBundleForExport
  → extractCareerBundleSyncEnrichment (career-core)
  → currentSyncEnrichment | null
  → props: dashboard-client → ProviderConsentConfirmationPanel
         → ProviderDerivedRuntimePreviewPanel
         → ProviderDerivedEnrichmentProposalPanel
         → deriveProviderEnrichmentChangePreviewViewModel
```

**Availability rules** — `currentSyncEnrichment` is used only when all are true:

- Dashboard has at least one application
- Export bundle passes canonical `parseCareerBundle`
- `syncEnrichment` exists and passes `validateCareerBundleSyncEnrichment`
- Baseline reflects the **current** dashboard session (same `applications` and `includeDemoSyncEnrichment` checkbox)

Otherwise `currentSyncEnrichment = null`. Absence is supported; the UI shows a neutral notice and compares against an empty baseline.

**Context isolation** — No cross-application or cross-session correlation. The baseline is always the active dashboard export shape, not a file upload or stored bundle.

**Not sent to the preview UI** — candidate, applications, `exportedAt`, `sourceProduct`, full bundle JSON, provider raw payloads, tokens, or connection identifiers.

Change preview baseline uses the **same** export composition policy as dashboard export (`deriveDashboardCareerBundleExportComposition`). Source kind (`none` / `demo` / `provider-derived-proposal`) is surfaced in the view model only.

## Comparison semantics

| Status | Meaning |
|--------|---------|
| `unchanged` | Normalized current equals suggested |
| `missing_current_value` | Current empty, valid suggestion present |
| `additive_suggestion` | List suggestion is a strict superset of current |
| `replacement_suggestion` | Both sides have values that differ (non-list or non-additive list) |
| `conflict` | Non-empty company hints are disjoint |
| `insufficient_confidence` | Lowest contributing signal confidence is `low` (`MIN` = `medium`) |
| `excluded_by_user` | All proposed signals excluded via review dismissal |
| `unsupported` | Reserved for fields without comparison adapter |

## Supported fields

- `stats.totalSignals`
- `stats.actionRequiredCount`
- `stats.upcomingCount`
- `stats.sourceCounts.gmail`
- `stats.sourceCounts.calendar`
- `stats.companyHints`
- `combinedSignals.count`
- `summary`

Nested `gmail` / `calendar` payloads, `generatedAt`, and raw provider fields are **not** compared in v1.

## Normalization

- Company hints: trim, lowercase, dedupe, sort
- Summary: trim, collapse whitespace, max 200 chars
- Lists: sorted, truncated to 15 items
- Numbers: finite integers only

## Data minimization

- Max 20 change items per preview
- Max 5 warnings per item
- Allowlisted `SafeDisplayValue` serialization only — no `JSON.stringify(bundle)` or `JSON.stringify(proposal)`

## Privacy invariants

- `assertEnrichmentChangePreviewSafe` uses `collectForbiddenKeysInDocument`
- No tokens, connection IDs, provider IDs, raw Gmail/Calendar fields

## UI states

`no_proposal`, `invalid_proposal`, `no_changes`, `has_changes`, `has_conflicts`, `low_confidence`, `partially_supported`, `export_available`, `safe_error`

Baseline availability is surfaced in the view model (`hasCurrentBaseline`, `baselineNotice`) — not a new domain status.

Integrated in `ProviderDerivedEnrichmentProposalPanel` **before** the download action. Career insights render **after** the proposal panel.

## Non-goals

- Apply / Save / Confirm changes
- CareerBundle or application mutation
- Persistence, import, upload, background sync
- Automatic apply after preview

## Relationship with proposal and export

```txt
proposal (ready) → change preview → export download → lifecycle ends
```

Change preview does not alter the export v1 contract or validator.

## Future apply decision

Any future **apply** workflow requires a separate ADR, threat model, user confirmation, idempotency, and rollback — independent of this read-only preview. ADR-002 remains export-only.

## Related docs

- [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL.md)
- [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT.md)
- [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md)
- [PROVIDER-DERIVED-CAREER-INSIGHTS.md](./PROVIDER-DERIVED-CAREER-INSIGHTS.md)
- [ADR-002](../../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md)
