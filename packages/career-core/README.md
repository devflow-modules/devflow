# @devflow/career-core

Career Suite domain contracts: CareerBundle schema, ApplyFlow handoff helpers, and Interview Lab preparation utilities.

## CareerBundle sync enrichment

`@devflow/career-core` can optionally attach a `CareerBundleUnifiedSyncEnrichment` produced by `@devflow/career-sync`.

The adapter does not fetch provider data, run OAuth, persist payloads, retain raw emails, retain raw calendar events, retain meeting links, or trigger automated application actions.

The enrichment remains user-reviewable and privacy-validated before future app consumption.

## CareerBundle sync enrichment export support

CareerBundle export helpers can optionally carry a validated `CareerBundleUnifiedSyncEnrichment` produced by `@devflow/career-sync`.

Bundles without sync enrichment remain valid. Unsafe enrichments are not attached.

This support does not fetch provider data, run OAuth, persist provider payloads, retain raw emails, retain raw calendar events, retain meeting links, or trigger automated application actions.
