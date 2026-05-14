# DevFlow Career Suite

> DevFlow Career Suite — A local-first career workflow connecting job applications to role-specific interview preparation.

Portfolio case: **ApplyFlow** (capture and organise applications) + **Interview Lab** (role-specific technical interview practice in English), connected by a typed **`CareerBundle` JSON** — **local-first**, **privacy-first**, no shared backend between the two apps.

Full product story in this file; app READMEs stay short and link here.

---

## Product overview

- **ApplyFlow** — LinkedIn Easy Apply copilot with a Next.js dashboard, Chrome MV3 extension, local history, funnel metrics, optional client-side AI. Users hand off a **`CareerBundle`** via **JSON download**, **Copy CareerBundle** (clipboard), or **Open Interview Lab** (opens import in a new tab; no bundle in the URL).
- **Interview Lab** — Next.js app for timed live-coding practice, English prompts, and reflection. Users import the bundle at **`/import/applyflow`** (**Import from clipboard**, paste + parse, or file upload), pick a role, and open practice with a **deterministic prep panel** (no LLM on this path).
- **Handoff** — one JSON payload validated by **`@devflow/career-core`** (Zod). Same schema for export and import. Optional UX hint: **`?from=applyflow`** on the import URL (no data in query params). *Typed contract, explicit boundaries, no magic sync.*

---

## Architecture

| Layer | Responsibility |
|-------|----------------|
| **`@devflow/career-core`** | `CareerApplication`, `CareerBundle`, `InterviewPreparation` (Zod); `parseCareerBundle`, `createCareerBundle`, `getInterviewReadyApplications`, `createInterviewPreparationFromApplication` (deterministic, no LLM). |
| **`apps/applyflow`** | Dashboard consumes `@devflow/applyflow-core` (unchanged). Maps rows → career schema, applies export selection rules, **Blob download** of JSON, **Copy CareerBundle** (clipboard), **Open Interview Lab** (client-side URL to import page). |
| **`apps/applyflow-extension`** | Source of real application history (not part of the JSON handoff UI, but the upstream of dashboard imports). |
| **`apps/interview-lab`** | `/import/applyflow` parses JSON (**Import from clipboard**, paste + **Parse field**, or upload), shows summary + role list; **Train for this role** persists prep to **`localStorage`** and opens `/practice/...?careerPrep=`. |

```mermaid
flowchart LR
  subgraph AF[ApplyFlow dashboard]
    A[ApplyFlowApplication[]] --> M[Map to CareerApplication]
    M --> B[CareerBundle JSON]
    B --> C[Clipboard or file download]
  end
  subgraph IL[Interview Lab]
    C --> P[parseCareerBundle]
    P --> L[List + summary]
    L --> T[Train → InterviewPreparation]
    T --> S[localStorage + practice UI]
  end
```

---

## Local-first and privacy-first model

- **Sensitive by default** — career history and employer names stay off a mandatory central API for this demo path.
- **Smaller surface** — no Career Suite backend; fewer moving parts for a portfolio narrative.
- **Explicit trade-off** — sync is **explicit JSON** (file or clipboard), not realtime cloud. Documented as a product choice, not a gap.
- **Export / copy** — JSON built in the browser; no upload to DevFlow servers in this flow.
- **Import** — parse and list client-side; **clipboard** or file; bundle optionally persisted in **`localStorage`** for the same browser profile.
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

2. **Handoff (recommended)** — In **Interview Lab · exportação local**, click **Copy CareerBundle**, then **Open Interview Lab**. In Interview Lab (new tab), use **Import from clipboard** when prompted (`?from=applyflow` is a UX hint only).

   **Alternative — file export** — Click **Exportar para Interview Lab** and save the `.json` file.

3. **Interview Lab — build and run** (second terminal):

   ```bash
   pnpm --filter @devflow/career-core build
   pnpm --filter @devflow/app-interview-lab dev
   ```

   Open **`http://localhost:3015/import/applyflow`** (or follow **Open Interview Lab** from ApplyFlow). Use **Import from clipboard**, or upload / paste JSON and **Parse field** after pasting.

4. **Review** — Check **Bundle summary** (source ApplyFlow, export date, totals).

5. **Train** — **Train for this role** on a row → practice opens with **ApplyFlow · interview prep** and the five prep blocks.

**One-liner (LinkedIn / GitHub):** *Local-first Career Suite — ApplyFlow funnel to Interview Lab prep over a typed JSON bundle; no backend, no LLM on the path, browser-only handoff.*

---

## Screenshots

> Add screenshots after running the local demo.

- ApplyFlow dashboard export card
- Interview Lab import screen
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
