# Provider-Derived Enrichment Compatibility Adapter

Career Suite includes a deterministic compatibility adapter from sandbox provider-derived signals to the existing sync enrichment contract.

The adapter does not access real provider data, modify the CareerBundle schema, retain raw provider payloads, expose tokens, or update applications automatically.

## Status

| Item | State |
|------|--------|
| Provider-derived sandbox composition | **Implemented** — `composeProviderDerivedSignals` |
| Enrichment compatibility adapter | **Implemented** — `adaptProviderDerivedSignalsToSyncEnrichment` |
| CareerBundle schema change | **Not in this PR** |
| Automatic CareerBundle attachment | **Not implemented** |

## Objective

Bridge two existing boundaries without merging them:

```txt
ProviderDerivedSandboxCompositionResult
  → adaptProviderDerivedSignalsToSyncEnrichment
  → CareerBundleUnifiedSyncEnrichment
```

This allows sandbox Gmail/Calendar derived signals to be expressed in the format already consumed by CareerBundle export/import helpers and Interview Lab sync preview — **without** auto-attaching enrichment to bundles.

## Relationship to CareerBundleUnifiedSyncEnrichment

| Module | Role |
|--------|------|
| `CareerBundleUnifiedSyncEnrichment` | Existing demo/import/export sync enrichment (`CareerSyncSignal`) |
| `provider-derived-signals` | Formal Gmail + Calendar sandbox composition (`ProviderDerivedSignal`) |
| `provider-derived-enrichment` | **This PR** — compatibility adapter between the two models |

Legacy `gmail-sync`, `calendar-sync`, and `buildCareerBundleSyncEnrichment` remain unchanged. Adapting composed signals does not mutate CareerBundle exports automatically.

## Input and output

```ts
adaptProviderDerivedSignalsToSyncEnrichment({
  composition: ProviderDerivedSandboxCompositionResult;
  generatedAt: string; // explicit, no Date.now() inside adapter
}): ProviderDerivedEnrichmentAdapterResult;
```

`ProviderDerivedEnrichmentAdapterResult`:

- `status`: `completed` | `blocked` | `error`
- `enrichment?`: `CareerBundleUnifiedSyncEnrichment` when completed
- invariant flags: `safeForClient`, `deterministic`, `userReviewRequired`, `runtime: "sandbox"`

## Mapping rules

| Provider-derived | CareerBundle sync |
|------------------|-------------------|
| `ProviderDerivedSignal.id` | `CareerSyncSignal.id` (deterministic, no new IDs) |
| `source: gmail` | `receivedAt` from `occurredAt` |
| `source: calendar` + upcoming kinds + `startsAt` | `eventAt` from `startsAt` |
| `company` | `companyHint` |
| numeric `confidence` | `low` / `medium` / `high` |
| pending-action kinds | `actionRequired: true` |
| `interview_likely` | interview stage, **no** `eventAt` |
| `interview_scheduled` | interview stage + `eventAt` when `startsAt` present |
| `offer_likely` / `rejection_likely` | likely, review-required summaries |

Pending-action kinds: `follow_up_required`, `follow_up_event_due`, `application_deadline_detected`.

Upcoming event kinds (Calendar + valid `startsAt`): `interview_scheduled`, `interview_rescheduled`, `recruiter_call_likely`, `follow_up_event_due`, `application_deadline_detected`.

## Status behaviour

| Composition status | Adapter result |
|--------------------|----------------|
| `completed` | Builds enrichment via `buildCareerBundleSyncEnrichment` |
| `error` | `blocked`, no enrichment |
| Validation failure | `error`, no enrichment, generic safe message |

No partial enrichment on failure.

## Validation

`validateAdaptedCareerBundleSyncEnrichment` mirrors `@devflow/career-core` privacy rules (package boundary prevents importing career-core from career-sync):

- `privacy.rawRetained === false`
- `privacy.redacted === true`
- `privacy.meetingLinksRemoved === true`
- `privacy.providerPayloadRetained === false`
- `privacy.userReviewRequired === true`
- no `providerId` on combined signals

Adapter returns `completed` only when validation passes.

## What this does not claim

Do **not** state:

- CareerBundle automatically enriched from Gmail and Calendar
- Real provider signals attached
- Production sync active

## Related docs

- [Provider-Derived Sandbox Composition](./PROVIDER-DERIVED-SANDBOX-COMPOSITION.md)
- [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)
- [Gmail Read-Only Sandbox Adapter](./GMAIL-READONLY-SANDBOX-ADAPTER.md)
- [Calendar Read-Only Sandbox Adapter](./CALENDAR-READONLY-SANDBOX-ADAPTER.md)
