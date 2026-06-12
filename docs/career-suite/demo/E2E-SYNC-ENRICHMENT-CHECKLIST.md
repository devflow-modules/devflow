# Career Suite End-to-End Sync Enrichment Checklist

## Purpose

This checklist validates the end-to-end Career Suite sync enrichment flow before opening any real provider integration.

Current implemented flow:

```txt
ApplyFlow
→ optional demo/sandbox sync enrichment export
→ CareerBundle JSON
→ Interview Lab import
→ read-only sync enrichment preview
```

## Current implementation status

* [x] ApplyFlow can export a regular CareerBundle without `syncEnrichment`
* [x] ApplyFlow can export a CareerBundle with demo/sandbox `syncEnrichment` when explicitly enabled
* [x] The opt-in toggle is off by default
* [x] Exported sync enrichment uses derived fake/sandbox signals only
* [x] Interview Lab can import the enriched CareerBundle
* [x] Interview Lab shows `Sync Enrichment Detected`
* [x] Preview is read-only
* [x] Preview is not stored
* [x] Existing CareerBundles without sync enrichment still work

> Automated gates: ApplyFlow export tests, Interview Lab import preview tests, `@devflow/career-core` sync enrichment validation, and `@devflow/career-sync` fixture builders — all green on `main` after PR #57.

## ApplyFlow checks

* [ ] Open ApplyFlow dashboard
* [ ] Confirm export panel is available
* [ ] Confirm demo sync enrichment option is visible
* [ ] Confirm option copy says fake/sandbox/demo
* [ ] Confirm option says no Gmail or Calendar connection is made
* [ ] Export with option off
* [ ] Confirm exported JSON does not contain `syncEnrichment`
* [ ] Export with option on
* [ ] Confirm exported JSON contains `syncEnrichment`
* [ ] Confirm `Practice this role` behavior is unchanged

## Interview Lab checks

* [ ] Open `/import/applyflow`
* [ ] Import regular CareerBundle
* [ ] Confirm bundle summary renders
* [ ] Confirm no sync enrichment preview appears
* [ ] Import enriched CareerBundle
* [ ] Confirm bundle summary renders
* [ ] Confirm sync enrichment preview appears
* [ ] Confirm preview shows aggregated metadata only
* [ ] Confirm preview does not show raw signals
* [ ] Confirm preview does not persist sync enrichment

## Privacy and data boundary checks

* [ ] No raw email body
* [ ] No raw calendar description
* [ ] No provider payload
* [ ] No attachments
* [ ] No meeting links
* [ ] No OAuth tokens
* [ ] No secrets
* [ ] No real provider IDs
* [ ] No real personal data
* [ ] No auto-submit behavior

## Runtime boundary checks

* [ ] No Gmail API call
* [ ] No Calendar API call
* [ ] No Nango runtime integration
* [ ] No provider fetch
* [ ] No backend persistence of sync enrichment
* [ ] No AI-required behavior
* [ ] No automated application action

## Validation commands

```bash
pnpm --filter applyflow test
pnpm --filter applyflow build

pnpm --filter @devflow/app-interview-lab test
pnpm --filter @devflow/app-interview-lab build

pnpm --filter @devflow/career-core test
pnpm --filter @devflow/career-core typecheck
pnpm --filter @devflow/career-core build

pnpm --filter @devflow/career-sync test
pnpm --filter @devflow/career-sync typecheck
pnpm --filter @devflow/career-sync build

pnpm check:buttons
pnpm -w run lint:design-system
```

## Backlog after this checkpoint

Keep these outside this PR:

* recording notes
* LinkedIn publish pack
* real Nango OAuth integration
* Gmail provider connector
* Calendar provider connector
* multi-agent advisory layer
