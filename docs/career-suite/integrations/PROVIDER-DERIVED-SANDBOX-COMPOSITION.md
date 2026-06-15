# Provider-Derived Sandbox Composition

Career Suite can deterministically compose review-required derived signals from fake Gmail and Calendar sandbox metadata.

The composition does not access real provider data, retain raw payloads, expose tokens, update CareerBundle, or make automatic career decisions.

## Status

| Item | State |
|------|--------|
| Gmail read-only sandbox adapter | **Implemented** — `createGmailReadOnlySandboxAdapter` |
| Calendar read-only sandbox adapter | **Implemented** — `createCalendarReadOnlySandboxAdapter` |
| Provider-derived sandbox composition | **Implemented** — `composeProviderDerivedSignals` |
| Provider-derived runtime composition | **Implemented** — ApplyFlow `executeApplyFlowProviderDerivedRuntimeBoundary` |
| Gmail/Calendar API runtime | **Implemented** (metadata-only, server-side) |
| CareerBundle mutation from composition | **Not implemented** |

## Objective

Prove that Gmail and Calendar read-only sandbox adapters can work together through a **deterministic**, **client-safe**, **provider-agnostic** composition layer:

```txt
GmailReadOnlySandboxAdapter → GmailDerivedSignal[]
CalendarReadOnlySandboxAdapter → CalendarDerivedSignal[]
composeProviderDerivedSignals → ProviderDerivedSignal[]
summarizeProviderDerivedSignals → ProviderDerivedSignalSummary
createProviderDerivedSandboxCompositionResult → ProviderDerivedSandboxCompositionResult
```

## Relationship to CareerBundleUnifiedSyncEnrichment

| Module | Role |
|--------|------|
| `CareerBundleUnifiedSyncEnrichment` | Previous demo/import/export composition using `CareerSyncSignal` |
| `provider-derived-signals` | **This PR** — formal composition of `GmailDerivedSignal` + `CalendarDerivedSignal` |

`ProviderDerivedSandboxCompositionResult` is a new composition boundary. Adapting it to `CareerBundleUnifiedSyncEnrichment` is a **separate future PR**. This PR does not alter CareerBundle schema or exports.

Legacy `gmail-sync`, `calendar-sync`, and `buildCareerBundleSyncEnrichment` remain unchanged. Adapting composed signals to `CareerBundleUnifiedSyncEnrichment` is a separate step — see [PROVIDER-DERIVED-ENRICHMENT-ADAPTER.md](./PROVIDER-DERIVED-ENRICHMENT-ADAPTER.md).

Signal IDs are runtime-neutral — see [PROVIDER-DERIVED-SIGNAL-ID-CONTRACT.md](./PROVIDER-DERIVED-SIGNAL-ID-CONTRACT.md).

## Normalized signal type

`ProviderDerivedSignal` is provider-agnostic and includes only:

- `id`, `source` (`gmail` \| `calendar`), `kind`, `occurredAt`
- optional `startsAt` (Calendar only when present)
- optional `company`, `confidence`, `sourceCount`
- `reviewRequired: true` (invariant)

**Not included:** subject, snippet, body, description, location, meeting links, emails, message/thread/event/calendar IDs, tokens, provider payloads.

## Composition rules

| Rule | Behaviour |
|------|-----------|
| Input immutability | Gmail/Calendar signal arrays are not mutated |
| Determinism | Same input → same output |
| Ordering | `occurredAt` ↑, then `source` (calendar before gmail), then `kind`, then `id` |
| Deduplication | Only exact duplicates within the same source (same source, kind, occurredAt, company, id) |
| Cross-provider merge | `interview_likely` + `interview_scheduled` remain distinct signals |

## Summary

`ProviderDerivedSignalSummary` aggregates:

- counts by provider and review-required total
- unique sorted `companies` and `kinds`
- `latestActivityAt` (max `occurredAt`)
- flags: `hasInterviewSignal`, `hasPendingActionSignal`, `hasOfferSignal`, `hasRejectionSignal`

No automatic decisions or inferences beyond existing signals.

## Sandbox composition result

`ProviderDerivedSandboxCompositionResult` invariant safety flags:

```txt
safeForClient: true
deterministic: true
importedRawProviderData: false
retainedRawPayload: false
retainedBodies: false
retainedSnippets: false
retainedDescriptions: false
retainedLocations: false
retainedMeetingLinks: false
retainedProviderIdentifiers: false
hasToken: false
userReviewRequired: true
```

## Executor

`executeProviderDerivedSandboxComposition` accepts injected Gmail and Calendar sandbox adapters plus their requests. When both adapters return `completed`, signals are composed. On any failure, returns atomic `error` with empty signals and empty summary — no partial results.

## Public API

```ts
normalizeGmailDerivedSignal(signal: GmailDerivedSignal): ProviderDerivedSignal;
normalizeCalendarDerivedSignal(signal: CalendarDerivedSignal): ProviderDerivedSignal;
composeProviderDerivedSignals(input): ProviderDerivedSignal[];
summarizeProviderDerivedSignals(signals): ProviderDerivedSignalSummary;
createProviderDerivedSandboxCompositionResult(input): ProviderDerivedSandboxCompositionResult;
executeProviderDerivedSandboxComposition(input): Promise<ProviderDerivedSandboxCompositionResult>;
```

## What this does not claim

Do **not** state:

- Gmail and Calendar sync active
- Real provider signals generated
- Emails and events imported
- CareerBundle automatically enriched

## Related docs

- [Gmail Read-Only Sandbox Adapter](./GMAIL-READONLY-SANDBOX-ADAPTER.md)
- [Calendar Read-Only Sandbox Adapter](./CALENDAR-READONLY-SANDBOX-ADAPTER.md)
- [Provider-Derived Enrichment Adapter](./PROVIDER-DERIVED-ENRICHMENT-ADAPTER.md)
- [Provider-Derived Runtime Composition](./PROVIDER-DERIVED-RUNTIME-COMPOSITION.md)
- [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)
- [Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)
