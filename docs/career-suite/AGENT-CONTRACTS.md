# Career Agent Contracts

Conceptual contracts for Career Suite modules. **No implementation in this document** — defines inputs, outputs, and boundaries before `packages/career-agents` code lands.

**Central protocol:** [`@devflow/career-core`](../../packages/career-core) **`CareerBundle` JSON** is the shared contract between ApplyFlow, Interview Lab, Resume Match, Practice, and future agents.

**Architecture:** [`AGENT-ARCHITECTURE.md`](./AGENT-ARCHITECTURE.md) · **Execution order:** [`ROADMAP-EXECUTION.md`](./ROADMAP-EXECUTION.md)

---

## Central protocol

| Artifact | Role |
|----------|------|
| **`CareerBundle`** | Export from ApplyFlow; import in Interview Lab; may embed or reference job/resume text in future versions (user-controlled). |
| **`CareerApplication`** | Single application row inside the bundle. |
| **`InterviewPreparation` / `CareerPrep`** | Local practice context derived from an application or ATS analysis. |
| **`postMessage` envelopes** | `devflow.careerBundle.v1` / `.ack.v1` — typed handoff between tabs; not a replacement for bundle schema. |

Agents and analyzers **consume and produce JSON-shaped data** compatible with these types. New fields require schema version bumps in `career-core`, not ad hoc app-local shapes.

---

## Modules

### job-analysis

**Purpose:** Normalize a job posting into structured signals for matching, prep, and (later) optional AI enrichment.

**Input (conceptual):**

- Job title
- Company (optional)
- Description / job text
- Requirements block (optional)
- Seniority hints (title, years, level words)
- Stack / technology hints

**Output (conceptual):**

- Normalized role title
- Inferred seniority (e.g. junior / mid / senior / staff)
- Required skills (canonical list)
- Nice-to-have skills
- Domain signals (e.g. fintech, B2B SaaS)
- Risk flags (e.g. vague requirements, unrealistic stack breadth)
- Suggested interview topics

**Deterministic-first:** Same input → same output without AI.

---

### resume-analysis

**Purpose:** Normalize resume or profile text into evidence-backed skill and seniority signals.

**Input (conceptual):**

- Resume text **or** structured profile (ApplyFlow `CandidateProfile` fields where available)
- Experience entries (optional structured)
- Skills list (optional)
- Projects (optional)
- Education (optional)

**Output (conceptual):**

- Normalized skills (canonical tokens)
- Seniority signals (with supporting evidence snippets)
- Strongest evidence (bullets tied to claims)
- Weak evidence (claims with thin support)
- Missing evidence (expected signals absent)
- Portfolio / project opportunities (gaps that a public artifact could address)

**Deterministic-first:** Heuristic tokenization and rules before any LLM summarization.

---

### ats-analysis (match layer)

**Purpose:** Compare job-analysis and resume-analysis outputs; produce match score and actionable gaps.

**Input (conceptual):**

- `job-analysis` output
- `resume-analysis` output

**Output (conceptual):**

- Match score (0–100, deterministic formula documented in package)
- Missing keywords (required vs present)
- Evidence gaps (skill claimed in JD but weak in resume)
- Suggested resume improvements (bullet-level, template strings — not auto-editing files)

**Note:** Interview Lab `/career/ats` today implements a **local heuristic** in-app. Phase 5+ migrates toward shared `career-agents` implementation without changing the user-facing privacy model.

---

### interview-coach

**Purpose:** Turn analysis outputs into practice-oriented artefacts.

**Input (conceptual):**

- `job-analysis` output
- `resume-analysis` output
- `ats-analysis` output

**Output (conceptual):**

- Likely interview questions (behavioural + technical buckets)
- STAR prompts (situation templates tied to weak areas)
- Weak areas ranked for study
- Practice plan (ordered list: topics → suggested Interview Lab problem or briefing focus)

**Deterministic-first:** Question templates and gap-driven lists before optional AI rephrasing.

---

### career-strategy

**Purpose:** Higher-level planning across multiple applications (future).

**Input (conceptual):**

- Multiple applications / bundles
- Aggregated gaps from `ats-analysis`
- Interview history (local session metadata)
- Target roles / companies (user-defined)

**Output (conceptual):**

- Weekly plan (time-boxed tasks)
- Positioning strategy (narrative angles)
- Project suggestions (portfolio gaps)

**MVP note:** Not required for Phases 1–6; contract reserved for orchestration phase.

---

## Deterministic-first rule

Every module **must** expose deterministic behaviour **before** any AI adapter is added.

| Requirement | Detail |
|-------------|--------|
| Reproducibility | Same inputs → same core output (modulo documented tie-break rules). |
| Tests | Vitest fixtures with golden outputs for representative JD/resume pairs. |
| Versioning | Output schema version field when shape evolves. |
| AI | Adapters return **enrichment** fields (e.g. `aiSummary?`) — core fields remain from deterministic path. |

---

## AI adapter boundary

- AI adapters **may enrich** outputs (wording, extra suggestions, coaching prose).
- AI adapters **must not replace** the core contract or sole source of match scores.
- AI adapters **must not run** without explicit user action (click / toggle), consistent with Interview Lab AI Answer Review and AI Resume Coaching.
- API keys stay **client-side** where the product already models opt-in (`localStorage`); no DevFlow server storage of user LLM keys for MVP.

---

## Privacy boundary

- **No agent may require remote persistence for MVP.**
- No silent transmission of resume or job text to third parties.
- Export/import remains **explicit** (file, clipboard, postMessage between user-opened tabs).
- Future sync (Nango, cloud) requires separate contract addendum and opt-in — out of Phase 1–6 scope.

---

## Integration boundaries (future)

| Integration | Role | MVP dependency? |
|-------------|------|-----------------|
| **LibreChat + MCP** | Local lab for prompt/tool experiments | **No** |
| **Nango** | Gmail / Calendar sync for timeline | **No** |
| **Multi-agent orchestration** | Coordinates modules after they exist standalone | **No** |
| **OpenClaw** | POC automation with human approval | **No** |

These are **accelerators** documented in [`AGENT-ARCHITECTURE.md`](./AGENT-ARCHITECTURE.md), not blockers for `packages/career-agents`.
