# Career Suite Demo

This folder contains **safe demo material** for presenting the Career Suite flow.

The demo uses **fake/sandbox data only**.

It shows how a CareerBundle can carry optional **sync enrichment** as derived metadata and how Interview Lab can render a **read-only preview** without provider calls, OAuth, persistence, raw email bodies, raw calendar descriptions, provider payloads, attachments, or meeting links.

**Walkthrough:** [`CAREER-SUITE-WALKTHROUGH.md`](./CAREER-SUITE-WALKTHROUGH.md)  
**Fixture:** [`fixtures/career-bundle-with-sync-enrichment.demo.json`](./fixtures/career-bundle-with-sync-enrichment.demo.json)  
**Readiness checklist:** [`DEMO-READINESS-CHECKLIST.md`](./DEMO-READINESS-CHECKLIST.md)

---

## What this demo shows

- **CareerBundle** as the portability contract between ApplyFlow and Interview Lab
- Optional **`syncEnrichment`** with derived Gmail-like and Calendar-like signals (sandbox)
- **`@devflow/career-core`** privacy validation on import
- **Interview Lab** aggregated read-only preview (`/import/applyflow`)
- **Privacy-first** narrative: derived signals, not an inbox/calendar client

## What this demo does not do

- Connect to Gmail or Google Calendar
- Run OAuth or use the Nango SDK at runtime
- Persist sync enrichment in Interview Lab (`localStorage` stores the base bundle only)
- Display raw email bodies, raw calendar descriptions, attachments, provider payloads, or meeting links
- Auto-apply to jobs, auto-send email, or require AI

## Files

| Path | Description |
|------|-------------|
| [`README.md`](./README.md) | This overview |
| [`CAREER-SUITE-WALKTHROUGH.md`](./CAREER-SUITE-WALKTHROUGH.md) | Step-by-step recording script |
| [`DEMO-READINESS-CHECKLIST.md`](./DEMO-READINESS-CHECKLIST.md) | Pre-recording / publish validation |
| [`fixtures/README.md`](./fixtures/README.md) | Fixture safety notes |
| [`fixtures/career-bundle-with-sync-enrichment.demo.json`](./fixtures/career-bundle-with-sync-enrichment.demo.json) | Fake bundle + sync enrichment |

## How to use the fixture

1. Start Interview Lab: `pnpm --filter @devflow/app-interview-lab dev` → `http://localhost:3015`
2. *(Optional)* Start ApplyFlow: `pnpm --filter applyflow dev` → `http://localhost:3010/dashboard`
3. On ApplyFlow dashboard, enable **Demo sync enrichment** on the export card (opt-in checkbox)
4. Use **Copy CareerBundle**, **Prepare in Interview Lab**, or **Exportar para Interview Lab**
5. Or open `docs/career-suite/demo/fixtures/career-bundle-with-sync-enrichment.demo.json` and paste into Interview Lab
6. Open **`/import/applyflow`**
7. Paste/upload → **Parse field**
8. Confirm **Bundle summary** and **Sync enrichment detected** preview
9. Optional: **Train for this role** on a demo application row

## Privacy boundaries

- Fixture signals use `safeSummary` strings only — no provider raw data
- All signal IDs are prefixed with `demo-`
- Companies and roles are fictional (`Acme SaaS Brasil`, `Beta Platform Labs`)
- Invalid or unsafe enrichment would be ignored by Interview Lab (see `@devflow/career-core` adapter)

## Suggested recording flow

1. **Context** (10s) — local-first Career Suite, typed CareerBundle handoff
2. **Import** (20s) — paste fixture, parse, show bundle summary
3. **Sync preview** (25s) — read-only panel: summary, counts, companies, privacy line
4. **Honesty** (15s) — sandbox signals, no OAuth, not persisted
5. **Close** (10s) — architecture diagram or public case link

Full script: [`../../public-cases/CAREER-SUITE-DEMO-SCRIPT.md`](../../public-cases/CAREER-SUITE-DEMO-SCRIPT.md)

## Related docs

- [Public case](../../public-cases/CAREER-SUITE.md)
- [Sync data boundaries](../integrations/SYNC-DATA-BOUNDARIES.md)
- [Career Suite README](../README.md)
