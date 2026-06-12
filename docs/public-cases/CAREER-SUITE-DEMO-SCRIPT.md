# Career Suite demo script

**Central message:** A local-first flow that turns job applications into practical interview preparation — without a mandatory backend or required upload of sensitive data.

**Companion docs:** [`CAREER-SUITE.md`](./CAREER-SUITE.md) · [`../career-suite/DEMO-CHECKLIST.md`](../career-suite/DEMO-CHECKLIST.md)

---

## Goal

Record a **60–90 second** screen demo that shows:

1. ApplyFlow organising applications (demo data).
2. One-click handoff to Interview Lab with ACK.
3. Resume Match running deterministically in the browser.
4. Practice session with role-specific prep panel.
5. *(Optional)* Sync enrichment read-only preview when demoing derived-signal import.

Audience: recruiter, tech lead, or founder evaluating **product engineering + privacy + applied AI judgment**.

---

## Setup

**Before recording:**

```bash
# Terminal 1 — from monorepo root
pnpm --filter @devflow/applyflow-core build
pnpm --filter @devflow/career-core build
pnpm --filter applyflow dev
# → http://localhost:3010/dashboard

# Terminal 2
pnpm --filter @devflow/app-interview-lab dev
# → http://localhost:3015
```

- Clean browser profile or incognito (no unrelated extensions on LinkedIn).
- Close noisy notifications.
- Resolution: 1920×1080 or 1440×900; zoom 100%.
- **Do not** show real API keys, real resumes, or real employer names — use **Carregar demo** only.
- Optional env (only if not using localhost defaults): `NEXT_PUBLIC_INTERVIEW_LAB_URL`, `NEXT_PUBLIC_APPLYFLOW_URL`.

---

## 60-second version

| Sec | Screen | Action | Say (voiceover hint) |
|-----|--------|--------|----------------------|
| 0–8 | ApplyFlow dashboard | Load demo | “This is ApplyFlow — applications stay on the device, organised in a funnel.” |
| 8–18 | Export card | Click **Prepare in Interview Lab** | “One click sends a typed CareerBundle — postMessage with ACK, no data in the URL.” |
| 18–28 | Interview Lab import | Show bundle summary | “Interview Lab validates the same Zod schema — import confirmed.” |
| 28–38 | Role list | **Train for this role** or show practice redirect | “Prep is generated deterministically from role and skills — no LLM on this path.” |
| 38–50 | `/career/ats` | Load sample → **Analyze ATS match** | “Resume Match runs locally — scores and gaps before any optional AI.” |
| 50–60 | Practice room | Show prep panel | “Same prep model whether you come from ApplyFlow or Resume Match — practice with context.” |

---

## 90-second version

Add to the 60s script:

| Sec | Screen | Action | Say |
|-----|--------|--------|-----|
| 60–72 | ApplyFlow table | **Practice this role** on one row | “Single-row bundle with practice intent — straight to the interview room.” |
| 72–82 | `/career/ats` | Scroll gaps / keywords | “Heuristic ATS-style signals — not a certified parser, but useful for interview focus.” |
| 82–90 | Closing | ApplyFlow + IL tabs | “Local-first by design: explicit handoff, optional AI, 175 automated tests on the Career Suite scope.” |

**Do not demo AI coaching** unless you intentionally show opt-in — keep core path credible without API keys.

---

## Recording checklist

- [ ] Demo data loaded (no PII)
- [ ] ACK message visible on ApplyFlow after handoff (or explain clipboard fallback honestly if blocked)
- [ ] Bundle summary visible in Interview Lab
- [ ] Resume Match scores visible on `/career/ats`
- [ ] Practice prep panel visible with company/role context
- [ ] No `.env`, API keys, or personal LinkedIn visible
- [ ] Cursor movement slow enough to read headings
- [ ] Audio clear; optional captions for PT or EN audience

**Screenshots to export after recording** (see [`CAREER-SUITE.md`](./CAREER-SUITE.md#screenshots-to-add)):

- `docs/career-suite/assets/applyflow-dashboard.png`
- `docs/career-suite/assets/interview-lab-import.png`
- `docs/career-suite/assets/resume-match-score.png`
- `docs/career-suite/assets/interview-practice-prep.png`

---

## Voiceover

**Opening (EN alternative for international audience):**

> “Job applications and interview prep usually live in different tools. Career Suite connects them with a typed JSON handoff — everything defaults to the browser, and AI is optional.”

**Closing (PT-BR):**

> “Isso é engenharia de produto com privacidade no centro: captura local, contrato tipado entre apps, análise determinística e prática com contexto da vaga — sem backend obrigatório no MVP.”

**If popup blocked / clipboard fallback happens during recording:**

> “When the browser blocks the popup, the bundle is copied to the clipboard — still explicit, still local, still validated by the same schema.”

Do not edit the recording to hide failures; either retry with popups allowed or use the honest fallback line — it reinforces the privacy/explicit-handoff story.

---

## Step — Import CareerBundle with sync enrichment

*(Optional segment — use when demoing the sync enrichment contract, not the default ApplyFlow handoff.)*

**Screen:** Interview Lab `/import/applyflow` after importing a CareerBundle JSON that includes a validated `syncEnrichment` (e.g. from a test fixture or serialized export with safe derived signals).

**Action:** Point to the **Sync enrichment detected** panel — summary, signal counts, company hints, privacy line.

**Say:**

> “When a bundle includes optional sync enrichment, Interview Lab shows a read-only aggregated preview. It does not connect to Gmail or Calendar, does not persist sync data, and does not display raw email bodies, calendar descriptions, provider payloads, attachments, or meeting links.”

**Key talking point:**

> “This is not automation that applies to jobs for the user. It is a privacy-safe context layer that helps the candidate understand process signals before preparing for interviews.”

**Honesty guardrails:**

- Gmail/Calendar integration is **sandbox / derived-signal contract** today — not production OAuth.
- ApplyFlow does not yet expose a user-facing export toggle for sync enrichment in the default demo path.
- Sync preview disappears on refresh unless the user re-imports a bundle with enrichment.

### Optional demo fixture

Use:

```txt
docs/career-suite/demo/fixtures/career-bundle-with-sync-enrichment.demo.json
```

This fixture uses **fake/sandbox data only** and is intended to demonstrate the import preview flow safely in Interview Lab (`/import/applyflow` → paste → **Parse field**).

Full walkthrough: [`../career-suite/demo/CAREER-SUITE-WALKTHROUGH.md`](../career-suite/demo/CAREER-SUITE-WALKTHROUGH.md)
