# Career Suite demo script

**Central message:** A local-first flow that turns job applications into practical interview preparation — without a mandatory backend or required upload of sensitive data.

**Companion docs:** [`CAREER-SUITE.md`](./CAREER-SUITE.md) · [`../career-suite/assets/README.md`](../career-suite/assets/README.md) · [`../career-suite/demo/CAREER-SUITE-WALKTHROUGH.md`](../career-suite/demo/CAREER-SUITE-WALKTHROUGH.md)

**Verified screenshots:** captured 2026-06-16 from commit `769b082` — see [asset checklist](../career-suite/assets/README.md).

---

## Goal

Record a **60–90 second** screen demo that shows:

1. ApplyFlow organising applications (demo data).
2. Demo sync enrichment + composition source visibility.
3. One-click handoff to Interview Lab with ACK (or honest clipboard fallback).
4. Resume Match running deterministically in the browser.
5. *(Optional)* Sync enrichment read-only preview via fixture paste.

Audience: recruiter, tech lead, or founder evaluating **product engineering + privacy + applied AI judgment**.

**Not in scope:** provider-derived signal review / change preview (requires Nango runtime — screenshots blocked).

---

## Setup

**Before recording:**

```bash
# Terminal 1 — from monorepo root
pnpm --filter @devflow/applyflow-core build
pnpm --filter @devflow/career-core build
pnpm --filter @devflow/career-sync build
pnpm --filter applyflow dev
# → http://localhost:3010/dashboard

# Terminal 2
pnpm --filter @devflow/app-interview-lab dev
# → http://localhost:3015
```

- Clean browser profile or incognito
- Resolution: **1440×900** (matches committed assets) or 1920×1080; zoom 100%
- **Carregar demo** only — no real employer history
- Allow popups for **Prepare in Interview Lab**
- Optional env: `NEXT_PUBLIC_INTERVIEW_LAB_URL`, `NEXT_PUBLIC_APPLYFLOW_URL` (localhost defaults work)

---

## 60–90 second version (recommended)

| Sec | Screen | Action | Say (voiceover hint) |
|-----|--------|--------|----------------------|
| 0–10 | ApplyFlow dashboard | **Carregar demo** | “ApplyFlow keeps applications on the device — organised funnel, no upload.” |
| 10–25 | Provider consent preview + export card | Scroll; mention mock boundaries | “Provider enrichment is consent-based — raw payloads never reach the UI.” |
| 25–40 | Export card | Enable **Demo sync enrichment**; show **Demonstrativo** badge | “Composition source is explicit — demo sandbox signals today.” |
| 40–55 | Export card | **Prepare in Interview Lab** | “One click — typed CareerBundle, postMessage with ACK, nothing in the URL.” |
| 55–70 | Interview Lab import | Bundle summary (+ sync preview if exported with demo enrichment) | “Same Zod schema on both sides — import confirmed locally.” |
| 70–90 | Case doc or split view | Trust model / ADRs | “Read-only lifecycle complete; Apply and proposal import explicitly deferred.” |

*No video file is committed — this is the recording script only.*

---

## Extended 90-second add-ons

| Sec | Screen | Action | Say |
|-----|--------|--------|-----|
| +0–12 | `/career/ats` | Load sample → **Analyze ATS match** | “Resume Match runs in the browser — deterministic gaps before optional AI.” |
| +12–20 | ApplyFlow table | **Practice this role** on one row | “Single-row bundle with practice intent — straight to prep.” |
| +20–30 | Closing | Tabs overview | “1,045 Vitest tests on Career Suite packages — governance without overclaiming E2E.” |

---

## Recording checklist

- [ ] Demo data loaded (no PII)
- [ ] ACK or honest clipboard fallback shown
- [ ] Bundle summary visible in Interview Lab
- [ ] Composition source badge visible if showing sync enrichment
- [ ] Resume Match scores visible (optional segment)
- [ ] No `.env`, API keys, or personal LinkedIn visible
- [ ] Did not claim live Gmail/Calendar unless runtime explicitly configured

**Committed screenshot paths:**

| File | Scene |
|------|-------|
| `docs/career-suite/assets/01-applyflow-dashboard.png` | Dashboard + demo |
| `docs/career-suite/assets/05-export-composition-source.png` | Demo sync enrichment + badge |
| `docs/career-suite/assets/06-interview-lab-handoff.png` | postMessage handoff received |
| `docs/career-suite/assets/07-resume-match.png` | ATS match |
| `docs/career-suite/assets/09-explicit-export.png` | Explicit JSON export |

**Blocked (document only):** `02-provider-derived-review.png`, `03-career-insights.png`, `04-enrichment-change-preview.png`

---

## Voiceover

**Opening (EN):**

> “Job applications and interview prep usually live in different tools. Career Suite connects them with a typed JSON handoff — everything defaults to the browser, and sensitive automation is explicitly deferred.”

**Closing (PT-BR):**

> “Engenharia de produto com privacidade no centro: captura local, contrato tipado, handoff explícito e testes automatizados — sem auto-apply e sem import de propostas exportadas.”

**If popup blocked / clipboard fallback:**

> “When the browser blocks the popup, the bundle is copied to the clipboard — still explicit, still local, still validated by the same schema.”

---

## Optional — Sync enrichment fixture segment

**Screen:** Interview Lab `/import/applyflow` after pasting:

```txt
docs/career-suite/demo/fixtures/career-bundle-with-sync-enrichment.demo.json
```

**Action:** **Parse field** → **Sync enrichment detected** panel.

**Say:**

> “Optional sync enrichment is read-only in Interview Lab — not persisted, no Gmail API call in this demo.”

**Honesty guardrails:**

- Production provider runtime needs documented flags + Nango — not shown in default demo
- ApplyFlow **Demo sync enrichment** checkbox is the safe export path for sandbox signals
- Sync preview disappears on refresh unless user re-imports

Full steps: [`../career-suite/demo/CAREER-SUITE-WALKTHROUGH.md`](../career-suite/demo/CAREER-SUITE-WALKTHROUGH.md)
