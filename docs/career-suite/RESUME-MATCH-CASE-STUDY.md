# Resume Match + AI Coaching Case Study

## 2. One-line positioning

Career Suite turns resume–job matching into targeted interview preparation through a **local-first, ATS-style** analysis flow and an **optional** AI coaching layer—without claiming certified ATS accuracy or sending resume text to any API until the user explicitly opts in.

---

## 3. Problem

- **Opaque fit:** Candidates often apply without a structured view of how their resume aligns with a specific job description.
- **Score-only tools:** Many “ATS checkers” stop at a number; they rarely connect match quality to **what to say in an interview** or **which gaps to address**.
- **Disconnected prep:** Interview practice is often generic, decoupled from the **same** resume and role the candidate is pursuing.
- **Privacy sensitivity:** Resumes and job descriptions contain employer names, compensation hints, and career narrative—users need a path that keeps **baseline analysis** off the wire when possible.

---

## 4. Product solution

The product closes the loop in one place (**Interview Lab · `/career/ats`**):

**Resume → Job description → Match analysis → Gap-oriented insights → (optional) AI coaching → Interview practice**

- **Resume Match** delivers a deterministic, **ATS-style** resume–job match: scores, keyword coverage, strengths, gaps, suggested bullets, and likely questions—all computed in the browser for the core pass.
- **Optional AI Resume Coaching** layers narrative coaching (summary, rewritten bullets, pitch, talking points, weakness framing, checklist) **only** after an explicit **Generate AI coaching** action, using the same browser-stored OpenAI settings as **AI Answer Review** (`/ai-review`).
- **CareerPrep handoff** writes preparation into the same `localStorage` shape used by ApplyFlow imports and opens **interview practice** with `?careerPrep=`, so the candidate trains against the **same** role context.

---

## 5. User flow

1. Open **`/career/ats`** (Resume Match).
2. Paste **resume text** and **job description**, or click **Load sample analysis** for a repeatable demo.
3. Run **Analyze ATS match** to execute the **local** heuristic analyzer (no backend required).
4. Review **scores**, **matched / missing keywords**, **strengths**, **gaps**, **suggested bullets**, and **likely interview questions**.
5. Optionally configure OpenAI on **`/ai-review`** (same app), return to Resume Match, and click **Generate AI coaching** when ready (settings refresh on **window focus** and cross-tab **`storage`** events—no full page reload required in typical multi-tab workflows).
6. Click **Practice interview from this analysis** to persist prep and open **`/practice/...?careerPrep=`** with the Career Suite prep panel.

---

## 6. Architecture

| Piece | Role |
|-------|------|
| **Local heuristic analyzer** | Deterministic keyword and seniority-style signals over resume + job text; produces a typed **`AtsAnalysisResult`**. |
| **`AtsAnalysisResult`** | Stable contract between UI, optional AI input, and the **CareerPrep** / practice adapter—scores and narrative sections stay predictable for tests and handoff. |
| **AI Resume Coaching** | Opt-in client module: builds prompts, calls OpenAI **only** on user click when settings allow, validates JSON with **Zod** before rendering. |
| **CareerPrep adapter** | Maps analysis (+ resume/job snippets as needed) into **`InterviewPreparation`** / storage consumed by the practice UI—same mental model as ApplyFlow handoff. |
| **AI settings** | **`localStorage`** keys shared with **AI Answer Review** (`preferOpenAi`, `openAiApiKey`); not sent to DevFlow servers in this MVP. |
| **`useRefreshableAiAnswerReviewSettings`** | Small hook: re-reads settings on **`focus`** and **`storage`** so the coaching CTA reflects the latest configuration without a larger global state layer. |

**Text diagram (data flow):**

```txt
Resume + Job Description
        ↓
Local ATS-style analyzer
        ↓
   AtsAnalysisResult
        ↓
Optional AI Resume Coaching  (explicit click + validated JSON)
        ↓
   CareerPrep handoff
        ↓
Interview Practice  (?careerPrep=)
```

---

## 7. Privacy and trust decisions

- **Local analysis by default:** The ATS-style pass runs **without** a DevFlow backend and **without** an external API for the core match.
- **AI is never automatic:** Nothing is sent to OpenAI until the user clicks **Generate AI coaching** and settings indicate an allowed path.
- **Narrow blast radius:** Resume and job text used in coaching are only included in the client request the user triggers; the product does **not** position itself as a certified ATS or a guarantee of ranking.
- **No key or content logging:** API keys and user resume/job bodies are not logged by this flow; portfolio demos should use synthetic or anonymized sample data where possible.
- **Browser key model (MVP):** Reuses the **AI Answer Review** pattern—user-held key in the browser—for demos and early validation, **not** as the final SaaS billing architecture.

---

## 8. Key technical decisions

1. **Deterministic heuristics before AI** — reproducible scores and sections for tests, demos, and handoff; AI augments rather than defines the baseline.
2. **Stable typed contract** — `AtsAnalysisResult` keeps UI, adapter, and optional AI inputs aligned.
3. **Optional provider boundary** — coaching client checks availability (`coachingUnavailableMessage`) and returns structured errors without mixing concerns into the analyzer.
4. **Schema validation before render** — Zod-validated AI JSON prevents half-parsed coaching from reaching the UI.
5. **Minimal refresh surface** — a dedicated hook for settings refresh avoids heavier global state while fixing real UX (tab switch / `/ai-review` configuration drift).
6. **No backend dependency for this phase** — keeps the portfolio story deployable as a static Next.js app slice and documents the explicit trade-off.

---

## 9. Testing and validation

Representative automated coverage in **Interview Lab** includes:

| Area | Examples |
|------|----------|
| Keyword extraction | `atsKeywordExtraction.test.ts` |
| Analyzer determinism / scoring | `atsAnalyzer.test.ts` |
| Practice / CareerPrep adapter | `atsPracticeAdapter.test.ts` |
| Sample demo data | `atsSampleData.test.ts` |
| AI prompt builder | `aiResumeCoachingPrompt.test.ts` |
| AI client (parse / network paths) | `aiResumeCoachingClient.test.ts` |
| Unavailable AI state / copy | `aiResumeCoachingFallback.test.ts` |
| Refreshable AI settings (focus / storage) | `use-refreshable-ai-answer-review-settings.test.ts` |

**Manual / CI hygiene for releases touching code:** `pnpm --filter @devflow/app-interview-lab test`, TypeScript `tsc --noEmit`, ESLint on touched files, and `pnpm --filter @devflow/app-interview-lab build`. This case study is **docs-only**; no test run is strictly required for merging documentation.

---

## 10. Product impact

- **Workflow, not a widget:** Converts a resume checker into an **interview readiness** path—match → gaps → (optional) coaching → practice.
- **Demo in under 30 seconds:** Sample loader + local analysis makes recordings and stakeholder walkthroughs predictable.
- **Portfolio-grade narrative:** Clear separation of **local trust path** vs **opt-in AI** vs **practice handoff** tells a credible engineering + product story.
- **Monetization optionality:** A future **AI coaching** or **Pro** tier can attach to the same contract (proxy API, usage metering) without rewriting the heuristic core.

---

## 11. Limitations (honest scope)

- The analyzer is **heuristic** and **ATS-style**, not a commercial ATS engine and **not** a predictor of employer-specific filters.
- **Keyword canon** is intentionally bounded for MVP (maintainable list, not infinite ontology).
- **Browser API key** model suits demos and power users; it is **not** the long-term enterprise architecture (no server-side key vault in this phase).
- **No PDF/DOCX parsing** yet—plain text in the textarea.
- **No persisted ATS history** across devices (browser `localStorage` only where applicable).
- **No server-side usage tracking** for AI calls in this build.

---

## 12. Future roadmap (suggested)

- PDF / DOCX resume ingestion with safe client-side parsing where feasible.
- **Server-side AI proxy** with authentication, rate limits, and usage metering.
- **Saved ATS sessions** (per browser or cloud with explicit opt-in).
- **Per-job comparison dashboard** (multiple JDs vs one resume).
- Deeper **tailored CV bullets** and **cover letter** generation from the same `AtsAnalysisResult`.
- **English interview simulation** grounded in Resume Match outputs (questions + rubric).
- **Exportable preparation report** (Markdown/PDF) for offline review.

---

## 13. Demo script (60–90 seconds)

1. **Problem (10s):** “Candidates need to see **fit** and **gaps** before they waste cycles—and they need that context to carry into **interview practice**, without sending a resume to a server by default.”
2. **Open Resume Match (10s):** Navigate to **`/career/ats`** in Interview Lab.
3. **Load sample (10s):** Click **Load sample analysis**, then **Analyze ATS match**.
4. **Show value (20s):** Walk through **scores**, **matched vs missing keywords**, **strengths**, **gaps**, and **likely questions**—emphasize **local**, **ATS-style**, not a certified score.
5. **Optional AI (15s):** If a key is configured on **`/ai-review`**, click **Generate AI coaching**; show structured sections after validation. If not configured, point to the **explicit** opt-in and the unavailable state.
6. **Handoff (15s):** **Practice interview from this analysis** → land on **`/practice/...`** with **CareerPrep** visible—same prep panel family as ApplyFlow.
7. **Close (10s):** “**Resume–job match → interview readiness** in one loop: deterministic core, optional AI, practice-ready handoff—**privacy-aware** by design.”

---

## Related documentation

- [`README.md`](./README.md) — Career Suite overview, ApplyFlow bridge, broader demo script.
- [`apps/interview-lab/README.md`](../../apps/interview-lab/README.md) — routes, local dev, and limitations for the Interview Lab app.

---

*Last updated: aligns with Resume Match (`/career/ats`), optional AI Resume Coaching, refreshable AI settings, and CareerPrep practice handoff in the Interview Lab codebase.*
