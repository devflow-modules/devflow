# DevFlow Career Suite

> DevFlow Career Suite — A local-first career workflow connecting job applications to role-specific interview preparation.

Portfolio case: **ApplyFlow** (capture and organise applications) + **Interview Lab** (role-specific technical interview practice in English), connected by a typed **`CareerBundle` JSON** — **local-first**, **privacy-first**, no shared backend between the two apps.

Full product story in this file; app READMEs stay short and link here.

---

## Product overview

- **ApplyFlow** — LinkedIn Easy Apply copilot with a Next.js dashboard, Chrome MV3 extension, local history, funnel metrics, optional client-side AI. Users hand off a **`CareerBundle`** via **Prepare in Interview Lab** (import list: `window.postMessage` + typed ACK, no bundle in the URL), **Practice this role** on a table row (same postMessage channel with optional `intent: "practice"` + `selectedApplicationId`), **JSON download**, **Copy CareerBundle** (clipboard), or **Open Interview Lab** (opens import in a new tab).
- **Interview Lab** — Next.js app for timed live-coding practice, English prompts, and reflection. Users import the bundle at **`/import/applyflow`** (automatic handoff when opened from ApplyFlow with `?handoff=postMessage`, optional **`?intent=practice`**, **Import from clipboard**, paste + parse, or file upload), use **`/career/ats` (Resume Match)** for deterministic resume–job analysis plus **optional OpenAI coaching** after an explicit click, pick a role from an import, or land straight on practice when the ApplyFlow practice handoff succeeds. **Train for this role** (or auto-redirect) persists prep to **`localStorage`** and opens `/practice/...?careerPrep=`.
- **Handoff** — one JSON payload validated by **`@devflow/career-core`** (Zod), including **`devflow.careerBundle.v1`** / **`devflow.careerBundle.ack.v1`** envelopes for `postMessage`. Optional fields **`intent`** (`"import"` \| `"practice"`, default `"import"`) and **`selectedApplicationId`**. Origins are allowlisted (`NEXT_PUBLIC_APPLYFLOW_URL` on Interview Lab when not using localhost defaults). Query params **`?from=applyflow`** / **`?handoff=postMessage`** / **`?intent=practice`** are UX hints only — no CareerBundle in the URL.

### Resume match (`/career/ats`)

- **What it is:** Paste **resume text** and a **job description** in the browser; a deterministic **ATS-style** keyword and seniority heuristic runs locally. It is **not** a certified ATS parser and does not call external APIs for the **core** analysis.
- **What you get:** Scores (0–100), matched/missing canonical tech keywords, vocabulary coverage, strengths, gaps, improvement suggestions, draft bullets, likely interview questions — then a one-click handoff into practice.
- **Optional AI (OpenAI):** After local results, **AI Resume Coaching** can generate summary, bullets, pitch, and talking points — **only** when the user clicks **Generate AI coaching**. Same browser-stored API key pattern as **`/ai-review`** (never sent to DevFlow servers; calls go directly to OpenAI from the browser when enabled).
- **Practice connection:** **Practice interview from this analysis** builds an `InterviewPreparation`, stores a **`CareerPrep`** row in `localStorage` (same shape as ApplyFlow), and opens the default practice route with `?careerPrep=`.
- **Demo loop (portfolio-friendly):** **Resume → Job description → Match analysis → Gap analysis → (optional AI coaching) → Interview practice** — use **Load sample analysis** + **Analyze ATS match** on a clean profile for a repeatable recording.

---

## Architecture

| Layer | Responsibility |
|-------|----------------|
| **`@devflow/career-core`** | `CareerApplication`, `CareerBundle`, `InterviewPreparation` (Zod); `parseCareerBundle`, `createCareerBundle`, `getInterviewReadyApplications`, `createInterviewPreparationFromApplication` (deterministic, no LLM); **ApplyFlow ↔ Interview Lab** `postMessage` envelopes (`devflow.careerBundle.v1` / `.ack.v1`) and origin helpers. |
| **`apps/applyflow`** | Dashboard consumes `@devflow/applyflow-core` (unchanged). Maps rows → career schema, applies export selection rules, **Blob download** of JSON, **Prepare in Interview Lab** (import list: `postMessage` + ACK / clipboard fallback), **Practice this role** per row (single-row bundle + practice intent), **Copy CareerBundle**, **Open Interview Lab**. |
| **`apps/applyflow-extension`** | Source of real application history (not part of the JSON handoff UI, but the upstream of dashboard imports). |
| **`apps/interview-lab`** | `/import/applyflow` (postMessage, clipboard, paste, upload); **`/career/ats`** resume–job **Resume Match** (deterministic heuristics, sample loader, `CareerPrep` practice handoff); **`intent=practice`** ApplyFlow shortcut; practice at `/practice/...?careerPrep=`. |

```mermaid
flowchart LR
  subgraph AF[ApplyFlow dashboard]
    A[ApplyFlowApplication[]] --> M[Map to CareerApplication]
    M --> B[CareerBundle JSON]
    B --> C[Clipboard or file download]
    B --> PM[postMessage v1 + ACK]
  end
  subgraph IL[Interview Lab]
    C --> P[parseCareerBundle]
    PM --> P
    P --> L[List + summary]
    L --> T[Train → InterviewPreparation]
    T --> S[localStorage + practice UI]
  end
```

---

## Local-first and privacy-first model

- **Sensitive by default** — career history and employer names stay off a mandatory central API for this demo path.
- **Smaller surface** — no Career Suite backend; fewer moving parts for a portfolio narrative.
- **Explicit trade-off** — sync is **explicit JSON** (file, clipboard, or `postMessage` between open tabs), not realtime cloud. Documented as a product choice, not a gap.
- **Export / copy** — JSON built in the browser; no upload to DevFlow servers in this flow.
- **Import** — parse and list client-side; **postMessage** (when opened from ApplyFlow with `?handoff=postMessage`, optionally `?intent=practice` for direct practice), **clipboard**, or file; bundle optionally persisted in **`localStorage`** for the same browser profile.
- **Preparation** — derived locally from role, skills, and optional job text; **no OpenAI** and no third-party APIs on this path.

---

## Demo script

Use a clean browser profile or incognito (avoid unrelated extensions on LinkedIn pages).

1. **ApplyFlow — build and run** (from monorepo root):

   ```bash
   pnpm --filter @devflow/applyflow-core build
   pnpm --filter @devflow/career-core build
   pnpm --filter applyflow dev
   ```

   Open **`http://localhost:3010/dashboard`**, load **Carregar demo** (or import a real extension JSON).

2. **Handoff — import list (one click)** — In **Interview Lab · exportação local**, click **Prepare in Interview Lab**. Interview Lab opens with `?handoff=postMessage`, receives the bundle, validates it, and sends an ACK. If automatic delivery fails, ApplyFlow copies the JSON to the clipboard — use **Import from clipboard** in Interview Lab.

   **Handoff — direct practice** — In the applications table, click **Practice this role** on a row. Interview Lab opens with `?intent=practice`, receives a single-row bundle, imports, and redirects to practice with `?careerPrep=` when the id matches.

   **Handoff (clipboard)** — **Copy CareerBundle**, then **Open Interview Lab**, then **Import from clipboard** (`?from=applyflow` is a UX hint only).

   **Alternative — file export** — Click **Exportar para Interview Lab** and save the `.json` file.

   **Resume-only demo (Interview Lab)** — Open **`http://localhost:3015/career/ats`**, click **Load sample analysis**, then **Analyze ATS match**. Review scores and sections, then **Practice interview from this analysis** to open the practice room with the prep panel (no ApplyFlow tab required).

3. **Interview Lab — build and run** (second terminal):

   ```bash
   pnpm --filter @devflow/career-core build
   pnpm --filter @devflow/app-interview-lab dev
   ```

   Open **`http://localhost:3015/import/applyflow`** (or use **Prepare in Interview Lab**, **Practice this role**, or **Open Interview Lab** from ApplyFlow). Use **Import from clipboard**, postMessage auto-import, or upload / paste JSON and **Parse field** after pasting.

4. **Review** — If you imported a bundle, check **Bundle summary** (source ApplyFlow, export date, totals). If you used **Resume Match**, review the score cards and keyword sections on `/career/ats` before the practice handoff.

5. **Train / practice** — If you used **Prepare in Interview Lab**, use **Train for this role** on a row → practice opens with **ApplyFlow · interview prep** and the five prep blocks. If you used **Practice this role** from ApplyFlow, you should land on practice automatically when the handoff succeeds. If you used **Resume Match** (`/career/ats`), use **Practice interview from this analysis** → prep panel shows **ATS-style match · interview prep**.

**One-liner (LinkedIn / GitHub):** *Local-first Career Suite — ApplyFlow funnel to Interview Lab prep over a typed JSON bundle; no backend, no LLM on the path, browser-only handoff.*

---

## Screenshots

> Add screenshots after running the local demo.

- ApplyFlow dashboard export card
- Interview Lab import screen
- Resume Match (`/career/ats`) with sample + scores
- Imported applications list
- Practice session with career prep panel

---

## Technical highlights

- **Zod** — single source of truth for the bundle schema between apps (`@devflow/career-core`).
- **Next.js 16** — ApplyFlow dashboard + Interview Lab (App Router); workspace packages transpiled where needed.
- **Chrome MV3** — ApplyFlow extension for Easy Apply (upstream of dashboard data).
- **Vitest** — targeted tests on `career-core`, ApplyFlow export mapping, Interview Lab import/storage.
- **Deterministic prep** — reproducible `InterviewPreparation` from application fields (portfolio-friendly: no API keys to demo the core story).

---

## Future roadmap (not implemented)

- Optional **encrypted cloud sync** with explicit opt-in and user-held keys.
- **Richer job text** in the bundle when ApplyFlow can safely expose more context (still user-controlled).
- **Monaco / worker** isolation for the Interview Lab runner (orthogonal to Career Suite).
- **Import history** UI (versioned bundles, diff between exports).

---

## Validation (tests)

```bash
pnpm --filter @devflow/career-core test
pnpm --filter applyflow test
pnpm --filter @devflow/app-interview-lab test
```

---

## Git hygiene (contributors)

**Typical files for a Career Suite–only change**

- `packages/career-core/**`
- `apps/applyflow/**` (export UI / `career-bundle-export` only when touching the bridge)
- `apps/interview-lab/**` (import UI, prep panel, storage helpers)
- `docs/career-suite/README.md`
- `README.md` / `docs/README.md` (short index links)
- `pnpm-lock.yaml` (when dependencies change)

**Do not** mix unrelated edits (e.g. WhatsApp Platform, Financeiro, Prisma, CI, middleware, `.env*`) in the same commit as Career Suite polish — keep the portfolio story reviewable and easy to revert.

---

## Related READMEs

- [`apps/applyflow/README.md`](../../apps/applyflow/README.md)  
- [`apps/interview-lab/README.md`](../../apps/interview-lab/README.md)  
- [`apps/applyflow-extension/README.md`](../../apps/applyflow-extension/README.md)  
- [`docs/applyflow/`](../applyflow/) (ApplyFlow product docs)
