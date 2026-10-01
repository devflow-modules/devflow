# ApplyFlow — portfolio assets

Canonical screenshots and architecture diagram for README / case study / demos.

**Privacy:** fictional / E2E fixture data only. Never commit real CV content, emails, tokens, or beta-user screenshots.

**Capture (local):** from `apps/applyflow`:

```bash
pnpm exec node ./scripts/capture-portfolio-screenshots.cjs
```

Uses E2E provider fixtures + `public/demo/portfolio-candidate-profile.json`.

---

## Tier-1 product screenshots (16:9 desktop, 1440×900)

| File | Surface | Demonstrates |
|------|---------|--------------|
| `applyflow-landing.png` | Landing `/` | Positioning, workflow framing, primary CTA |
| `applyflow-discovery.png` | Discovery + match | Multi-provider hit, decision, score, matched skills |
| `applyflow-queue.png` | Opportunity queue | Saved jobs ≠ applications; derived active queue |
| `applyflow-readiness.png` | Analysis + readiness | Job context + readiness checklist |
| `applyflow-lifecycle.png` | Lifecycle | Screening state, transitions, next action |
| `applyflow-applications.png` | Applications | Multi-status table, age, next-action cues |

## Architecture

| File | Notes |
|------|-------|
| `applyflow-architecture.svg` | Browser local-first + Match Engine + optional V2/Postgres; providers without CV |

---

## Status

| Asset | Classification |
|-------|----------------|
| New `applyflow-*.png` / `.svg` | **KEEP** (current Tier-1 set) |
| Legacy `01-applyflow-*.png` … `06-*.png` | **OUTDATED** for current product story (kept for historical doc links) |

Do not duplicate trees. Prefer replacing files in this folder.

Related: [`../CASE_STUDY.md`](../CASE_STUDY.md) · [`../DEMO_SCRIPT.md`](../DEMO_SCRIPT.md) · [`../SCREENSHOTS_CHECKLIST.md`](../SCREENSHOTS_CHECKLIST.md).
