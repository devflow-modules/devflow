# Provider-Derived Career Insights (Read-Only)

ApplyFlow presents a **read-only** insights panel that aggregates client-safe metrics from provider-derived signals already loaded in the current session.

The panel does not fetch new provider data, persist insights, import exports, mutate CareerBundle, or update applications.

## Status

| Item | State |
|------|--------|
| Read-only career insights panel | **Implemented** — ApplyFlow dashboard preview flow |
| Import / apply / persistence | **Explicitly deferred** — [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md), [ADR-002](../../adr/ADR-002-ENRICHMENT-PROPOSAL-EXPORT-ONLY.md) |

## Purpose

Transform existing provider-derived signals into a clear, demonstrable product experience:

- Summarize what is available after explicit preview and manual review
- Surface derived categories, confidence distribution, and review/proposal/export state
- Reinforce privacy and non-automation boundaries

Insights are **derived from permitted metadata only** — not full Gmail or Calendar content.

## Allowed data sources

| Source | Use |
|--------|-----|
| In-memory `ProviderDerivedSignal[]` from runtime preview | Counts, kinds, confidence, company hints |
| Review selection state | Selected / unselected / dismissed counts |
| Enrichment proposal state | Proposal status, export availability |
| Preview warnings | Privacy-related messages already derived |

Metrics are computed by `deriveProviderDerivedCareerInsightsMetrics` in `@devflow/career-sync`. The ApplyFlow view model (`deriveProviderCareerInsights`) combines connection, preview, review, and proposal state.

## Prohibited fields

The panel and view model must never render or serialize:

- OAuth tokens, connection IDs, provider IDs
- Raw Gmail/Calendar payloads (subjects, snippets, bodies, descriptions, locations, meeting links)
- Attendee or organizer emails
- Provider message/thread/event/calendar IDs

Defensive tests use `collectForbiddenKeysInDocument` from `@devflow/career-sync`.

## Presented states

Derived deterministically from existing session state (no parallel state machine):

| Phase | Meaning |
|-------|---------|
| `no_valid_connection` | Consent or server verification missing |
| `connected_idle` | Ready to run preview |
| `preview_loading` | Preview in progress |
| `preview_blocked` / `preview_error` | Safe failure |
| `preview_without_signals` | No reviewable signals |
| `preview_partial` | Partial preview with signals |
| `awaiting_review` / `review_in_progress` | Manual review |
| `selection_ready` | Selection marked ready |
| `proposal_ready` | In-memory proposal built |
| `export_available` | Valid local export available |

## Relationship to review, proposal, and export

```txt
preview → review → proposal → export
         ↑
    insights (read-only, all stages)
```

The insights panel sits in the existing preview dashboard card. It observes the same in-memory state as review, proposal, and export panels. It does not trigger those workflows.

## What this does not do

- Does not call Gmail, Calendar, or Nango
- Does not persist insights or history
- Does not import proposal export files
- Does not apply enrichment to CareerBundle or applications
- Does not run background sync or auto-apply

## Implementation

| Module | Role |
|--------|------|
| `@devflow/career-sync` `deriveProviderDerivedCareerInsightsMetrics` | Pure domain metrics |
| `provider-derived-career-insights.ts` | ApplyFlow view model |
| `provider-derived-career-insights-panel.tsx` | Read-only UI |
| `provider-derived-runtime-preview-panel.tsx` | Host panel (no new route) |

## Related docs

- [PROVIDER-DERIVED-RUNTIME-PREVIEW.md](./PROVIDER-DERIVED-RUNTIME-PREVIEW.md)
- [PROVIDER-DERIVED-RUNTIME-REVIEW.md](./PROVIDER-DERIVED-RUNTIME-REVIEW.md)
- [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL.md)
- [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-EXPORT.md)
- [PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md](./PROVIDER-DERIVED-ENRICHMENT-PROPOSAL-LIFECYCLE.md)
