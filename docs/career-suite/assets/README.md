# Career Suite — Screenshot assets

Verified captures for the [product and architecture case](../CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md), landing, and demo scripts.

**Capture commit:** `769b082` (main after PR #104) · **Capture date:** 2026-06-16  
**Viewport:** 1440×900 · PNG · zoom 100% · Chromium headless (Playwright 1.49.1)

All captures use **demo/sandbox data only** — no real emails, employer history, API keys, tokens, or provider raw payloads.

---

## Asset checklist

| File | Status | Screen | State | Data source | PII review | Result |
|------|--------|--------|-------|-------------|------------|--------|
| `01-applyflow-dashboard.png` | **captured** | ApplyFlow `/dashboard` | Demo loaded (~20 fictitious applications) | `public/demo/applications-demo.json` via **Carregar demo** | Pass — Microsoft-style demo names only | 1440×900 · 334 KB |
| `02-provider-derived-review.png` | **blocked** | Dashboard — provider-derived signal review | Runtime preview with selectable signals | Requires `CAREER_PROVIDER_RUNTIME_ENABLED`, Nango env, consent flow completion | N/A | See [block reason](#blocked-captures) |
| `03-career-insights.png` | **blocked** | Dashboard — Career Insights panel | In-memory provider-derived metrics | Depends on completed runtime preview + review | N/A | See [block reason](#blocked-captures) |
| `04-enrichment-change-preview.png` | **blocked** | Dashboard — Enrichment change preview | Ready proposal + baseline comparison | Depends on provider-derived proposal in session | N/A | See [block reason](#blocked-captures) |
| `05-export-composition-source.png` | **captured** | Dashboard — Interview Lab export card | **Demo sync enrichment** checked; composition source **Demonstrativo** | Demo checkbox (`includeDemoSyncEnrichment`) — no provider connection | Pass | 1440×900 · 206 KB |
| `06-interview-lab-handoff.png` | **captured** | Interview Lab `/import/applyflow?from=applyflow&handoff=postMessage` | **CareerBundle received from ApplyFlow** after **Prepare in Interview Lab** (postMessage + ACK) | Demo dashboard export with demo sync enrichment enabled | Pass — bundle summary only, no raw JSON panel expanded | 1440×900 · 94 KB |
| `07-resume-match.png` | **captured** | Interview Lab `/career/ats` | Sample analysis loaded + ATS match results | Built-in sample data (deterministic, no PII) | Pass | 1440×900 · 133 KB |
| `08-interview-practice.png` | **not applicable** | Practice room | — | Covered by demo script; no distinct screenshot added (avoid redundancy with handoff + resume match) | — | — |
| `09-explicit-export.png` | **captured** | ApplyFlow dashboard — export card | **Exportar para Interview Lab** + composition source visible | Demo data + explicit JSON download path (read-only) | Pass | 1440×900 · 291 KB |

**Total captured assets:** 5 required/optional PNGs · **~1.06 MB**

---

## Blocked captures

Provider-derived panels **02–04** require a completed server-side runtime preview:

- Env flags: `CAREER_PROVIDER_RUNTIME_ENABLED`, `NANGO_RUNTIME_ENABLED`, `GMAIL_PROVIDER_ENABLED`, `CALENDAR_PROVIDER_ENABLED`, `NANGO_SECRET_KEY`
- Consent checkbox in `ProviderConsentConfirmationPanel` is **read-only** in the current sandbox UI; **Start provider connection check** stays disabled without runtime configuration
- No safe UI bypass exists without a configured Nango test account — **not improvised** for this docs-only PR

The **Provider consent preview** (mock boundaries, no OAuth) is visible on the dashboard without flags but does **not** substitute for signal review — documented in the case text only.

**Interview Lab handoff via browser automation:** `postMessage` between tabs failed in MCP browser tools; succeeded in Playwright same-browser-context (used for `06`).

**Fixture paste path** (`career-bundle-with-sync-enrichment.demo.json` → **Parse field**) remains documented in [walkthrough](../demo/CAREER-SUITE-WALKTHROUGH.md) for sync enrichment preview when postMessage is blocked.

---

## Capture commands

```bash
pnpm install
pnpm --filter @devflow/career-core build
pnpm --filter @devflow/career-sync build
pnpm --filter applyflow dev          # http://localhost:3010/dashboard
pnpm --filter @devflow/app-interview-lab dev  # http://localhost:3015
```

1. ApplyFlow → **Carregar demo**
2. Optional: enable **Demo sync enrichment** for composition source `demo`
3. **Prepare in Interview Lab** (postMessage) or **Exportar para Interview Lab** (JSON download)
4. Interview Lab → `/import/applyflow` or `/career/ats` for Resume Match

Provider-derived captures: see [REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md](../integrations/REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md) when flags and test credentials are available.

### Reuse existing ApplyFlow assets

General dashboard/table shots (pre–Career Suite naming) remain at [`docs/applyflow/assets/`](../../applyflow/assets/).

---

## PII review (2026-06-16)

Manual inspection of all committed PNGs:

- No real names, emails, phones, addresses, or government IDs
- No tokens, OAuth codes, connection IDs, message/thread/event IDs
- No real email subjects, snippets, bodies, or calendar descriptions
- No meeting links or real employer names from live accounts
- Demo companies: Northwind Apps (demo), Contoso Labs (demo), etc.; fixture uses Acme SaaS Brasil / Beta Platform Labs (explicit sandbox labels)

**Visual edits:** crop/resize/compress only (Playwright viewport capture). No content altered post-capture.
