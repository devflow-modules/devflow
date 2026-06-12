# Career Suite demo fixtures

**Fake / sandbox data only.** Do not use real emails, calendar events, meeting links, or personal identifiers in these files.

## Files

| File | Purpose |
|------|---------|
| [`career-bundle-with-sync-enrichment.demo.json`](./career-bundle-with-sync-enrichment.demo.json) | CareerBundle with optional `syncEnrichment` for Interview Lab import preview demo |

## What is included

- Fake candidate and applications (`demo-application-*`)
- Derived sync signals (`demo-signal-*`) with `safeSummary` text only
- Aggregated `stats` and privacy metadata
- Privacy flags: `rawRetained: false`, `providerPayloadRetained: false`, `meetingLinksRemoved: true`

## What is excluded

- Raw email bodies or HTML
- Raw calendar descriptions
- Provider payloads, attachments, OAuth tokens
- Meeting URLs (Zoom, Google Meet, Teams, etc.)
- Real thread/message/event IDs
- Real personal email or phone numbers

## Validate JSON locally

```bash
python3 -m json.tool docs/career-suite/demo/fixtures/career-bundle-with-sync-enrichment.demo.json >/dev/null && echo "JSON OK"
```

Optional — validate against `@devflow/career-core` (after build):

```bash
pnpm --filter @devflow/career-core build
node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { parseCareerBundleWithSyncEnrichment } from '@devflow/career-core';
const data = JSON.parse(readFileSync('docs/career-suite/demo/fixtures/career-bundle-with-sync-enrichment.demo.json', 'utf8'));
const r = parseCareerBundleWithSyncEnrichment(data);
console.log(r.ok ? 'PARSE OK' : r.error);
if (r.ok) console.log('sync status:', r.syncEnrichmentStatus);
"
```
