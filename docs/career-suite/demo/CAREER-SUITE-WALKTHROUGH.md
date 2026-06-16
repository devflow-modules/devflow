# Career Suite walkthrough — verified demo path

**Audience:** portfolio recording, GitHub README, LinkedIn demo clip  
**Data:** fake/sandbox only — demo dashboard + optional [fixture](./fixtures/career-bundle-with-sync-enrichment.demo.json)  
**Screenshots:** [assets checklist](../assets/README.md) (captured 2026-06-16 @ `769b082`)

---

## Prerequisites

```bash
pnpm install
pnpm --filter @devflow/applyflow-core build
pnpm --filter @devflow/career-core build
pnpm --filter @devflow/career-sync build

# Terminal 1
pnpm --filter applyflow dev
# → http://localhost:3010/dashboard

# Terminal 2
pnpm --filter @devflow/app-interview-lab dev
# → http://localhost:3015
```

- Clean browser profile — no real resumes, API keys, or personal LinkedIn data
- Popups allowed for **Prepare in Interview Lab** (postMessage handoff)
- **No feature flags required** for the default demo path (provider-derived panels 02–04 need Nango — see [blocked captures](../assets/README.md#blocked-captures))

---

## Full walkthrough (ApplyFlow → Interview Lab)

### 1. ApplyFlow dashboard

Navigate to `http://localhost:3010/dashboard` → **Carregar demo**.

**Expected:** ~20 fictitious applications (Northwind Apps (demo), Contoso Labs (demo), …), funnel metrics, provider consent **preview** (mock — no OAuth).

**Screenshot:** [`01-applyflow-dashboard.png`](../assets/01-applyflow-dashboard.png)

### 2. Composition source (demo sync enrichment)

Scroll to **Interview Lab · exportação local**.

Enable **Demo sync enrichment** (checkbox, off by default).

**Expected:** Composition source badge **Demonstrativo**; export includes sandbox derived signals in CareerBundle JSON.

**Screenshot:** [`05-export-composition-source.png`](../assets/05-export-composition-source.png)

### 3. Handoff — Prepare in Interview Lab

Click **Prepare in Interview Lab**.

**Expected:** New tab `http://localhost:3015/import/applyflow?from=applyflow&handoff=postMessage` → **CareerBundle received from ApplyFlow** + bundle summary + ACK on ApplyFlow tab.

**Screenshot:** [`06-interview-lab-handoff.png`](../assets/06-interview-lab-handoff.png)

**Fallbacks:**

| Condition | Action |
|-----------|--------|
| Popup blocked | **Copy CareerBundle** → **Open Interview Lab** → **Import from clipboard** |
| postMessage timeout | Paste JSON → **Parse field** |
| Sync enrichment preview demo | Paste [fixture](./fixtures/career-bundle-with-sync-enrichment.demo.json) → **Parse field** → **Sync enrichment detected** panel |

### 4. Explicit JSON export (alternative)

On ApplyFlow dashboard with demo loaded: **Exportar para Interview Lab** (downloads `.json` locally).

**Screenshot:** [`09-explicit-export.png`](../assets/09-explicit-export.png)

### 5. Resume Match (Interview Lab)

Navigate to `http://localhost:3015/career/ats` → **Load sample analysis** → **Analyze ATS match**.

**Expected:** Deterministic scores/gaps in browser — no mandatory LLM.

**Screenshot:** [`07-resume-match.png`](../assets/07-resume-match.png)

### 6. Provider-derived path (blocked in default env)

Signal review, Career Insights, and Enrichment change preview require:

- Server env: `CAREER_PROVIDER_RUNTIME_ENABLED`, `NANGO_RUNTIME_ENABLED`, `GMAIL_PROVIDER_ENABLED`, `CALENDAR_PROVIDER_ENABLED`, `NANGO_SECRET_KEY`
- Completed consent + **Start provider connection check**

**Not capturable** without configured Nango test account — do not use personal Gmail/Calendar.

---

## 60–90 second recording script

| Time | Screen | Action | Say (hint) |
|------|--------|--------|------------|
| 0–10s | ApplyFlow dashboard | **Carregar demo** | “Applications stay on the device — local-first, no mandatory backend.” |
| 10–25s | Export card | Enable **Demo sync enrichment**; point to consent preview boundaries | “Provider signals are derived and reviewed — raw email never reaches the UI.” |
| 25–40s | Export card | Show **Demonstrativo** badge | “Composition source is visible before export — demo sandbox today.” |
| 40–55s | Handoff | **Prepare in Interview Lab** | “Typed CareerBundle via postMessage — validated schema, ACK, no data in the URL.” |
| 55–70s | Interview Lab import | Bundle summary (+ sync preview if fixture used) | “Interview Lab imports read-only; sync enrichment is not persisted.” |
| 70–90s | Case doc / architecture | Trust model + ADRs | “Apply and import are explicitly deferred — lifecycle ends at export/handoff.” |

*Video not included in repo — script only.*

---

## Sync enrichment fixture path (optional segment)

Use when postMessage handoff is blocked or when demoing the sync preview panel explicitly.

1. Open `docs/career-suite/demo/fixtures/career-bundle-with-sync-enrichment.demo.json`
2. Interview Lab `/import/applyflow` → paste → **Parse field**
3. Point to **Sync enrichment detected** — summary, counts, privacy line

**Say:** “Fake Gmail/Calendar-like signals — sandbox contract only. No OAuth in this build.”

---

## Honesty checklist (before publishing)

- [ ] Stated that dashboard data is demo/fictitious
- [ ] Did not claim live Gmail/Calendar connection (unless flags + test account explicitly shown)
- [ ] Did not claim sync enrichment is persisted in Interview Lab
- [ ] Did not show real PII
- [ ] Did not claim provider-derived review screenshots if only demo path was recorded
- [ ] Linked to [full case](../CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md) for ADRs and limitations

---

## Suggested voiceover (PT-BR)

> “Isso não é integração com caixa de entrada — é uma camada de contexto derivado, pensada para privacidade.”

> “O handoff é explícito: postMessage com ACK ou export JSON — nada na URL.”

> “Apply e import de propostas continuam deferred — o ciclo read-only termina no export.”
