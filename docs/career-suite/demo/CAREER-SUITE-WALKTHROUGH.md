# Career Suite walkthrough — sync enrichment demo

**Audience:** portfolio recording, GitHub README, LinkedIn demo clip  
**Data:** fake/sandbox only — [`fixtures/career-bundle-with-sync-enrichment.demo.json`](./fixtures/career-bundle-with-sync-enrichment.demo.json)  
**Duration:** ~2–3 minutes (sync segment only)

---

## Prerequisites

```bash
pnpm --filter @devflow/career-core build
pnpm --filter @devflow/app-interview-lab dev
# → http://localhost:3015/import/applyflow
```

Use a clean browser profile. Do not show real resumes, API keys, or personal LinkedIn data.

---

## Step-by-step

### 1. Open Interview Lab

Navigate to `http://localhost:3015/import/applyflow`.

**Say:** “Interview Lab imports a typed CareerBundle from ApplyFlow — everything validates in the browser.”

### 2. Load the demo fixture

**Option A — ApplyFlow opt-in export**

1. Open ApplyFlow dashboard with demo data loaded.
2. Enable **Demo sync enrichment** (checkbox, off by default).
3. Click **Copy CareerBundle** or **Exportar para Interview Lab**.

**Option B — Static fixture file**

Open `docs/career-suite/demo/fixtures/career-bundle-with-sync-enrichment.demo.json` in your editor.

Copy the **entire** JSON file.

### 3. Paste and parse

Paste into the **CareerBundle JSON** textarea.

Click **Parse field** (or upload the `.json` file).

**Say:** “This bundle is fake demo data — fictional company, fictional candidate, no real provider payloads.”

### 4. Show Bundle summary

Point to **Bundle summary**: source ApplyFlow, exported time, role count, interview-ready count.

**Say:** “The base bundle still works the same way — applications, skills, status — even when sync enrichment is present.”

### 5. Show Sync enrichment preview

Point to **Sync enrichment detected** (read-only panel).

Highlight:

| Field | Demo value (approx.) |
|-------|----------------------|
| Summary | Derived signals for Acme SaaS Brasil |
| Signals | 4 |
| Pending actions | 1 |
| Upcoming events | 1 |
| Sources | Gmail 2 · Calendar 2 |
| Companies | Acme SaaS Brasil, Beta Platform Labs |
| Privacy line | Raw data not retained · meeting links removed |

**Say:** “This is not an email client integration. This is a privacy-safe derived context layer.”

### 6. Explain stats and privacy metadata

**Say:** “The app never shows raw email bodies, raw calendar descriptions, attachments, provider payloads, or meeting links — only aggregated, reviewable metadata.”

**Say:** “Privacy flags are validated in career-core before the preview renders. Unsafe enrichment would be ignored.”

### 7. Explain non-persistence

Refresh the page or open DevTools → Application → Local Storage.

**Say:** “Sync enrichment is not persisted in Interview Lab. Only the base CareerBundle is stored for practice flows.”

### 8. Explain no provider calls

**Say:** “There is no Gmail API call, no Calendar API call, and no OAuth in this build. Signals come from a sandbox contract — production connectors would be a separate, consent-based phase.”

### 9. Optional — Train for this role

Click **Train for this role** on **Acme SaaS Brasil / Senior Frontend Engineer**.

**Say:** “Practice prep is still deterministic from application fields — sync enrichment adds context for the human reviewing the import, not hidden automation.”

### 10. Close with architecture

Show the flow (screen or doc):

```txt
Fake Gmail/Calendar-like signals (sandbox)
→ @devflow/career-sync contract
→ CareerBundleUnifiedSyncEnrichment
→ @devflow/career-core privacy validation
→ Interview Lab read-only preview
```

**Say:** “The enrichment is optional. Old CareerBundles without syncEnrichment keep working exactly as before.”

---

## Suggested voiceover lines (EN)

> “This is not an email client integration. This is a privacy-safe derived context layer.”

> “The app never shows raw email bodies, raw calendar descriptions, attachments, provider payloads, or meeting links.”

> “The enrichment is optional. Old CareerBundles keep working.”

> “This is not automation that applies to jobs for the user — it helps the candidate understand process signals before interview prep.”

## Suggested voiceover lines (PT-BR)

> “Isso não é integração com caixa de entrada — é uma camada de contexto derivado, pensada para privacidade.”

> “O app não mostra corpo de e-mail, descrição de evento, anexos, payload de provider nem links de reunião.”

> “O enrichment é opcional. Bundles antigos continuam válidos.”

---

## Honesty checklist (before publishing)

- [ ] Stated that data is fake/sandbox
- [ ] Did not claim live Gmail/Calendar connection
- [ ] Did not claim sync enrichment is persisted
- [ ] Did not show real PII
- [ ] Linked to public case or repo docs for depth
