# DevFlow Career Suite — Local-first career workflow

> **Public case study** — portfolio narrative for recruiters, tech leads and founders.  
> Technical deep dives: [`../career-suite/README.md`](../career-suite/README.md) · [`../career-suite/RESUME-MATCH-CASE-STUDY.md`](../career-suite/RESUME-MATCH-CASE-STUDY.md) · [`CAREER-SUITE-DEMO-SCRIPT.md`](./CAREER-SUITE-DEMO-SCRIPT.md)

---

## One-liner

**Local-first Career Suite connecting job applications, resume–job matching and role-specific interview preparation through a typed JSON handoff — no mandatory backend, no auto-submit, AI only when the user explicitly opts in.**

---

## Problem

Candidates using LinkedIn Easy Apply face a gap between **application volume** and **structured learning**:

1. **Applications stay scattered** — status, company, role and skills live across tabs, notes and spreadsheets, not in one actionable funnel.
2. **Easy Apply does not become structured practice** — submitting forms does not translate into interview preparation tied to the actual role.
3. **Interview prep is often generic** — mock interviews and coding drills rarely reflect the company, stack or seniority of the application in progress.
4. **AI tools push sensitive uploads** — resume and job text often require cloud upload before any value appears, which is a poor default for career data.

The product question was not “apply faster”, but **turn applications into deliberate preparation** while keeping the user in control of their data.

---

## Solution

DevFlow Career Suite connects three local-first surfaces:

| Piece | Role |
|-------|------|
| **ApplyFlow** | Chrome MV3 extension + Next.js dashboard — captures and organises applications, funnel metrics, export. |
| **CareerBundle** | Typed JSON contract (`@devflow/career-core`, Zod) — explicit handoff between apps. |
| **Interview Lab** | Next.js practice app — imports bundle, runs **Resume Match** (`/career/ats`), generates deterministic prep, opens timed practice. |

**Core path is deterministic.** Optional **AI Resume Coaching** runs only after an explicit click, using browser-stored OpenAI settings — same pattern as AI Answer Review, not a black-box “AI product”.

---

## Product flow

```txt
LinkedIn Easy Apply + ApplyFlow Extension
        ↓
ApplyFlow Dashboard (local import / demo)
        ↓
CareerBundle JSON (export · postMessage · clipboard · file)
        ↓
Interview Lab Import (/import/applyflow)
        ↓
Optional sync enrichment preview (read-only, not persisted)
        ↓
Resume Match (/career/ats) — optional branch
        ↓
Interview Practice (/practice/...?careerPrep=)
```

**One-click handoff:** ApplyFlow opens Interview Lab with `?handoff=postMessage`, sends the bundle, Interview Lab validates and **ACKs** delivery — no CareerBundle in the URL.

**Direct practice:** **Practice this role** on a table row sends a single-row bundle with `intent: practice` and redirects to practice when the handoff succeeds.

---

## Architecture

```txt
apps/applyflow              — dashboard, CareerBundle export, postMessage sender
apps/applyflow-extension    — upstream capture (LinkedIn Easy Apply, chrome.storage.local)
apps/interview-lab          — import, Resume Match, practice UI, optional AI coaching, sync enrichment preview
packages/career-core        — Zod schemas, parse/create bundle, prep builders, postMessage envelopes, sync enrichment adapter/export
packages/career-sync        — derived Gmail/Calendar signal contracts (sandbox/fixtures; no OAuth runtime)
packages/applyflow-core     — application types, metrics, import validation (ApplyFlow domain)
docs/career-suite/          — internal product docs, demo checklist, Resume Match case study
```

### `@devflow/career-core`

Shared package between ApplyFlow and Interview Lab:

- **`CareerBundle`**, **`CareerApplication`**, **`InterviewPreparation`** — Zod-validated types.
- **`parseCareerBundle`** / **`createCareerBundle`** — single validation path for clipboard, file, paste and postMessage payload.
- **`parseCareerBundleWithSyncEnrichment`** / **`serializeCareerBundleWithSyncEnrichment`** — optional `syncEnrichment` export/import with privacy validation.
- **`validateCareerBundleSyncEnrichment`** — rejects unsafe provider/raw retention flags before attach or import.
- **`createInterviewPreparationFromApplication`** — deterministic prep (skills, role, company) without LLM.
- **PostMessage contract** — `devflow.careerBundle.v1` / `devflow.careerBundle.ack.v1`, origin allowlist, optional `intent` and `selectedApplicationId`.

Monorepo boundary: apps share **only** via `packages/*`; no shared backend for this MVP.

---

## Sync enrichment flow

Career Suite supports an **optional** sync enrichment flow for CareerBundle imports. The design centres on **derived, reviewable metadata** — not raw provider data.

```txt
Gmail-like / Calendar-like signals (fixtures / sandbox)
        ↓
@devflow/career-sync
        ↓
CareerBundleUnifiedSyncEnrichment
        ↓
@devflow/career-core privacy validation
        ↓
CareerBundle export/import helpers
        ↓
Interview Lab read-only preview (/import/applyflow)
```

**What exists today**

- **`@devflow/career-sync`** — deterministic normalizers and read-only Gmail/Calendar **preview** builders from fixtures and Nango-like sandbox payloads. **No OAuth, no Nango SDK at runtime, no provider API calls.**
- **`@devflow/career-core`** — validates privacy flags (`rawRetained`, `providerPayloadRetained`, `meetingLinksRemoved`, etc.) before attaching or importing `syncEnrichment`.
- **Interview Lab** — when an imported CareerBundle includes a **valid** `syncEnrichment`, shows an aggregated **read-only** preview (summary, signal counts, company hints, privacy metadata). **Sync enrichment is not persisted** in Interview Lab — only the base CareerBundle is stored in `localStorage`.

**What the preview shows (aggregated only)**

- Summary · total signals · action-required count · upcoming events count
- Source counts (Gmail / Calendar labels) · stage counts · company hints
- Privacy metadata (derived-only, no raw retention)

**What it deliberately does not show**

- Raw email bodies · raw calendar descriptions · provider payloads · attachments · meeting links

**What is not implemented yet**

- Real Gmail or Google Calendar OAuth · Nango production connector · ApplyFlow UI to opt into export with sync enrichment · persistent sync storage in apps

This is a **privacy-safe context layer** for understanding process signals before interview prep — **not** automation that applies to jobs on the user's behalf.

A **safe demo fixture** is available under [`docs/career-suite/demo/fixtures/`](../career-suite/demo/fixtures/) to demonstrate the CareerBundle sync enrichment import flow without using real provider data. See [`docs/career-suite/demo/README.md`](../career-suite/demo/README.md) and [`CAREER-SUITE-WALKTHROUGH.md`](../career-suite/demo/CAREER-SUITE-WALKTHROUGH.md).

---

## Privacy-first decisions

| Decision | Rationale |
|----------|-----------|
| **No Career Suite backend in MVP** | Smaller attack surface; user data stays on device unless they choose to export. |
| **No auto-submit in ApplyFlow** | Human action on every form step; aligned with platform rules and trust. |
| **No bundle in URL** | Query params are UX hints only (`?from=applyflow`, `?handoff=postMessage`). |
| **postMessage + ACK** | Typed, origin-checked handoff between open tabs; clipboard/file as explicit fallback. |
| **Browser storage** | Extension `chrome.storage.local`, dashboard `localStorage`, Interview Lab prep persistence — all client-side. **Sync enrichment preview is session-only in Interview Lab; not written to storage.** |
| **AI opt-in only** | Resume Match core runs offline in the browser; OpenAI calls only after **Generate AI coaching**. |
| **No DevFlow server for resume text** | Coaching requests go from browser to OpenAI when enabled — not through a DevFlow API in this build. |

---

## Technical highlights

- **Next.js App Router** (ApplyFlow + Interview Lab) · **React 19** · **TypeScript strict**
- **Zod** — schema as contract between extension, dashboard and practice app
- **Chrome MV3** — extension upstream; export JSON from local history
- **Local-first design** — explicit handoff instead of silent cloud sync
- **Deterministic scoring** — Resume Match heuristics (keywords, seniority signals, coverage) — reproducible in tests
- **postMessage ACK** — ApplyFlow knows when Interview Lab accepted the bundle; clipboard fallback on timeout or blocked popup
- **Vitest** — unit tests on bundle parse, handoff sender/receiver, ATS analyzer, prep adapters, sync enrichment validation and Interview Lab preview helpers
- **pnpm workspace + Turbo** — shared `career-core` without coupling app runtimes

---

## AI usage

AI is a **coaching amplifier**, not the product engine:

1. **Resume Match** — deterministic analysis first (scores, gaps, suggested bullets, likely questions).
2. **AI Resume Coaching** — optional layer: summary, rewritten bullets, pitch, talking points — triggered only by user click.
3. **AI Answer Review** (`/ai-review`) — separate opt-in path for written answer feedback; shares browser key storage with coaching.

Positioning: **Product engineering and privacy defaults first**; LLM where it adds narrative value after structured local analysis.

---

## Testing strategy

```bash
pnpm --filter @devflow/career-core test
pnpm --filter applyflow test
pnpm --filter @devflow/app-interview-lab test
```

**Current baseline:** **200+ tests passing** in Career Suite scope (`career-core`, ApplyFlow, Interview Lab, `career-sync`).

| Area | What tests protect |
|------|-------------------|
| **Bundle schema** | Valid/invalid JSON, Zod error messages, interview-ready selection |
| **Export mapping** | ApplyFlow row → `CareerApplication`, single-row practice bundle |
| **Handoff** | postMessage envelopes, ACK parsing, wrong origin, sender timeout/clipboard fallback |
| **Import** | Clipboard parse, storage round-trip, postMessage evaluation, sync enrichment preview (read-only) |
| **Sync enrichment** | Privacy validation, export/import round-trip, invalid enrichment ignored, no raw payload in preview |
| **Preparation** | Deterministic `InterviewPreparation` from application fields |
| **Resume Match** | Keyword extraction, score stability, practice adapter from ATS result |
| **AI coaching** | Prompt shape, response parse, unavailable states — **not** called in deterministic core tests |

---

## Demo script

**Duration:** 60–90 seconds · **Profile:** clean browser / incognito · **Data:** ApplyFlow demo dataset (no real PII)

1. Open **ApplyFlow** dashboard → **Load demo** — show funnel and application table.
2. Click **Prepare in Interview Lab** — new tab opens; confirm **ACK** message on ApplyFlow (bundle imported).
3. In Interview Lab import screen — show **Bundle summary** and role list.
4. *(Optional)* If the bundle includes validated **`syncEnrichment`**, show the **read-only sync preview** — explain aggregated signals only, no Gmail/Calendar connection, no persistence.
5. Click **Train for this role** **or** use **Practice this role** from ApplyFlow for direct redirect.
6. Open **`/career/ats`** → **Load sample analysis** → **Analyze ATS match** — show scores without network for core pass.
7. **Practice interview from this analysis** — practice room with prep panel (`?careerPrep=`).

Full checklist: [`../career-suite/DEMO-CHECKLIST.md`](../career-suite/DEMO-CHECKLIST.md) · recording script: [`CAREER-SUITE-DEMO-SCRIPT.md`](./CAREER-SUITE-DEMO-SCRIPT.md)

---

## Screenshots to add

Capture after running the local demo (do not commit placeholder images):

```txt
docs/career-suite/assets/applyflow-dashboard.png       — demo loaded, export card visible
docs/career-suite/assets/interview-lab-import.png     — bundle summary after handoff (optional sync preview if demoing enrichment)
docs/career-suite/assets/resume-match-score.png       — /career/ats scores + keyword sections
docs/career-suite/assets/interview-practice-prep.png  — practice UI with Career prep panel
```

Optional: ApplyFlow ACK success state, AI coaching panel (only if demoing opt-in path).

---

## Trade-offs

| Trade-off | Consequence |
|-----------|-------------|
| **Local-first** | No automatic multi-device sync; user exports or re-imports explicitly. |
| **No backend** | Strong privacy story; handoff UX must be clear (postMessage, clipboard, file). |
| **Resume Match is heuristic** | Not a certified ATS parser; useful for gap awareness and practice context, not hiring decisions. |
| **AI requires user action + key** | No “magic score from the cloud”; demos work fully without OpenAI. |
| **JSON handoff vs realtime** | Simpler security model; two tabs or file transfer instead of WebSocket sync. |
| **Sync enrichment is optional** | Strong privacy defaults; bundles without enrichment behave exactly as before. |
| **Gmail/Calendar signals are sandbox today** | Derived-signal contracts and preview UX exist; real OAuth connectors are future work. |
| **Limited job text in bundle today** | Skills and metadata export; full job description enrichment is roadmap (still user-controlled). |

---

## Roadmap

**Implemented and documented (sync enrichment stack):**

- Career sync foundation (`@devflow/career-sync`)
- Gmail read-only sync preview (fixtures / sandbox)
- Calendar read-only sync preview (fixtures / sandbox)
- CareerBundle unified sync enrichment contract
- `@devflow/career-core` adapter + export/import helpers
- Interview Lab read-only import preview (not persisted)

**Future — not implemented in this case:**

- **ApplyFlow opt-in export surface** for sync enrichment
- **Real Nango OAuth integration** behind explicit user consent
- **LibreChat / MCP lab** demonstration over deterministic signals
- **Multi-agent advisory layer** on top of derived signals (not replacement of deterministic core)
- Encrypted cloud sync — opt-in, user-held keys
- Richer job context in CareerBundle when ApplyFlow can expose more text safely
- Import history — versioned bundles, diff between exports
- Better analytics — funnel → prep → practice completion (still privacy-preserving)

---

## What this case demonstrates

- **Product architecture** — multi-app workflow with a typed contract instead of ad hoc APIs
- **Security & privacy** — sensitive career data defaults to the browser; explicit handoff and opt-in AI
- **Developer experience** — shared Zod package, Vitest at boundaries, monorepo boundaries respected
- **Testing discipline** — handoff and deterministic paths covered; AI isolated from core gates
- **Cross-app integration** — postMessage ACK, clipboard fallback, shared prep model
- **Applied AI with judgment** — coaching after local analysis, not “wrapper around ChatGPT”
- **SaaS thinking** — clear MVP scope, documented trade-offs, roadmap separated from demo
- **Product engineering** — end-to-end narrative from capture → prep → practice, shippable as portfolio proof

---

## Related links

| Document | Audience |
|----------|----------|
| [`../career-suite/README.md`](../career-suite/README.md) | Contributors — architecture, commands, git hygiene |
| [`../career-suite/RESUME-MATCH-CASE-STUDY.md`](../career-suite/RESUME-MATCH-CASE-STUDY.md) | Resume Match + optional AI — technical depth |
| [`../career-suite/DEMO-CHECKLIST.md`](../career-suite/DEMO-CHECKLIST.md) | Pre-demo validation |
| [`CAREER-SUITE-LINKEDIN-POST.md`](./CAREER-SUITE-LINKEDIN-POST.md) | Draft posts (PT-BR) |
| [`CAREER-SUITE-DEMO-SCRIPT.md`](./CAREER-SUITE-DEMO-SCRIPT.md) | Screen recording script |
| [`../career-suite/demo/README.md`](../career-suite/demo/README.md) | Safe demo fixture + walkthrough index |
| [`../applyflow/PUBLIC_CASE_STUDY.md`](../applyflow/PUBLIC_CASE_STUDY.md) | ApplyFlow-only public case |
