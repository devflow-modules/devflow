# Career Suite Demo Readiness Checklist

## Purpose

This checklist helps validate the Career Suite demo before recording, publishing, or presenting it.

The demo uses **fake/sandbox data only** and demonstrates a privacy-safe CareerBundle sync enrichment import preview in Interview Lab.

**Related:** [`README.md`](./README.md) · [`CAREER-SUITE-WALKTHROUGH.md`](./CAREER-SUITE-WALKTHROUGH.md) · [`fixtures/career-bundle-with-sync-enrichment.demo.json`](./fixtures/career-bundle-with-sync-enrichment.demo.json)

---

## Pre-demo technical checks

- [ ] `main` is up to date with `origin/main`
- [ ] working tree is clean
- [ ] no unexpected open PRs
- [ ] demo fixture JSON is valid (`python3 -m json.tool docs/career-suite/demo/fixtures/career-bundle-with-sync-enrichment.demo.json`)
- [ ] `@devflow/career-core` tests pass (`pnpm --filter @devflow/career-core test`)
- [ ] `check:buttons` passes (`pnpm check:buttons`)
- [ ] `lint:design-system` passes (`pnpm -w run lint:design-system`)

---

## Demo fixture checks

- [ ] fixture uses fake candidate data (`Demo Candidate`)
- [ ] fixture uses fake company names (`Acme SaaS Brasil`, `Beta Platform Labs`)
- [ ] fixture uses fake signal IDs (`demo-signal-*`, `demo-application-*`)
- [ ] fixture does not contain real email addresses
- [ ] fixture does not contain phone numbers
- [ ] fixture does not contain raw email bodies
- [ ] fixture does not contain raw calendar descriptions
- [ ] fixture does not contain provider payloads
- [ ] fixture does not contain attachments
- [ ] fixture does not contain meeting links (Zoom, Google Meet, Teams, etc.)
- [ ] fixture does not contain OAuth tokens or secrets

---

## Interview Lab demo checks

- [ ] Interview Lab dev server running (`pnpm --filter @devflow/app-interview-lab dev` → `http://localhost:3015`)
- [ ] open `/import/applyflow`
- [ ] *(optional)* ApplyFlow **Demo sync enrichment** checkbox enabled before export
- [ ] paste or upload the demo CareerBundle fixture
- [ ] CareerBundle summary renders
- [ ] sync enrichment preview renders (**Sync enrichment detected**)
- [ ] preview is read-only (no edit controls)
- [ ] preview shows aggregated metadata only (summary, counts, company hints, privacy line)
- [ ] preview does not render raw signals or full signal list
- [ ] preview does not render meeting links
- [ ] preview does not persist sync enrichment (refresh clears preview unless re-imported)
- [ ] no provider calls are triggered (no network to Gmail/Calendar/Nango)

---

## Recording talking points

- [ ] CareerBundle is the portability contract between ApplyFlow and Interview Lab
- [ ] sync enrichment is **optional**
- [ ] sync enrichment is based on **derived signals** (sandbox/fixture today)
- [ ] `@devflow/career-core` validates privacy boundaries before attach/import
- [ ] Interview Lab shows a **read-only** aggregated preview
- [ ] old CareerBundles without `syncEnrichment` keep working
- [ ] this is **not** an auto-apply system
- [ ] this is **not** a live Gmail/Calendar integration yet
- [ ] future provider integrations must be explicit, consent-based, and revocable

---

## Claims to avoid

**Do not say:**

- "It connects to Gmail"
- "It connects to Google Calendar"
- "It uses Nango in production"
- "It stores your emails"
- "It stores your calendar"
- "It applies to jobs automatically"
- "It uses AI to decide for the candidate"

**Say instead:**

- "It demonstrates a privacy-safe sync enrichment contract."
- "The current demo uses fake/sandbox data."
- "The app renders aggregated derived metadata only."
- "The architecture is ready for future consent-based provider integrations."

---

## Final publish checklist

- [ ] README links work ([`demo/README.md`](./README.md), [`career-suite/README.md`](../README.md))
- [ ] demo fixture path is correct (`docs/career-suite/demo/fixtures/career-bundle-with-sync-enrichment.demo.json`)
- [ ] walkthrough path is correct (`docs/career-suite/demo/CAREER-SUITE-WALKTHROUGH.md`)
- [ ] public case is aligned with implemented behavior ([`CAREER-SUITE.md`](../../public-cases/CAREER-SUITE.md))
- [ ] LinkedIn post avoids overclaiming ([`CAREER-SUITE-LINKEDIN-POST.md`](../../public-cases/CAREER-SUITE-LINKEDIN-POST.md))
- [ ] video recording does not reveal secrets, `.env`, API keys, or local personal data
- [ ] browser profile is clean (no unrelated tabs, notifications, or real PII on screen)
