# @devflow/career-core

Career Suite domain contracts: CareerBundle schema, ApplyFlow handoff helpers, and Interview Lab preparation utilities.

## CareerBundle sync enrichment

`@devflow/career-core` can optionally attach a `CareerBundleUnifiedSyncEnrichment` produced by `@devflow/career-sync`.

The adapter does not fetch provider data, run OAuth, persist payloads, retain raw emails, retain raw calendar events, retain meeting links, or trigger automated application actions.

The enrichment remains user-reviewable and privacy-validated before future app consumption.
