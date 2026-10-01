# ApplyFlow — demo script (~3 minutes)

Deterministic portfolio demo. Use **fictional** fixtures only. No real CV, no live paid providers, no production DB.

**Release framing (say once):** invite-only closed beta · public signup not approved · no auto-apply.

**Preferred setup:** local-first with E2E provider fixtures (`APPLYFLOW_E2E_PROVIDER_FIXTURES=1`) **or** the capture script path in `apps/applyflow/scripts/capture-portfolio-screenshots.cjs`. Seed profile: `public/demo/portfolio-candidate-profile.json` (Alex Rivera — fictional).

Do **not** enable dangerous production fixture flags on hosted environments.

---

## Timing

| Clock | Beat |
|-------|------|
| 0:00–0:20 | What ApplyFlow solves |
| 0:20–0:50 | Discovery + Match |
| 0:50–1:15 | Save → Queue |
| 1:15–1:45 | Analysis + Readiness |
| 1:45–2:20 | Register + Mark Sent |
| 2:20–2:45 | Lifecycle + Next Action |
| 2:45–3:00 | Architecture / reliability summary |

Total ≈ **3:00**. Skip Account / Analytics / setup screens unless asked.

---

## Beats (what · problem · engineering)

### 0:00–0:20 — Problem → product

| | |
|--|--|
| **Sees** | Landing: local-first workflow, closed beta, primary CTA |
| **Solves** | Fragmentation across discovery, fit, prep, and tracking — without mass apply |
| **Engineering** | Explicit release posture; privacy-first positioning baked into the product story |

**VO:** “ApplyFlow is a local-first career workflow: discover jobs, evaluate fit deterministically, prioritize a queue, prepare, then track lifecycle after you actually apply — no auto-submit.”

---

### 0:20–0:50 — Discovery + Match

| | |
|--|--|
| **Sees** | Provider select (Remote OK / Jobgether), hit card, APPLY + score, matched skills, save CTA |
| **Solves** | Multi-provider discovery with an explainable fit preview before anything is persisted |
| **Engineering** | Server adapters + deterministic Match Engine; CV **not** on the search payload |

**VO:** “Search hits a fixture provider. Match is local and deterministic — skill coverage, not an LLM. Preview does not persist.”

---

### 0:50–1:15 — Save → Queue

| | |
|--|--|
| **Sees** | Active queue with saved jobs, match badges, Analisar CTA, filters/tabs |
| **Solves** | Prioritization: **saved job ≠ application**; human focus separate from recommendation |
| **Engineering** | Derived queue from `Job.status === reviewing` — no Shortlist entity |

**VO:** “Save creates a Job in the opportunity queue. Nothing was submitted to an employer.”

---

### 1:15–1:45 — Analysis + Readiness

| | |
|--|--|
| **Sees** | Job context, match evidence, readiness checklist (ready / pending) |
| **Solves** | Preparation guidance without inventing another persisted score |
| **Engineering** | Readiness derived from analysis + application state |

**VO:** “Readiness tells me what’s ready versus still missing before I register an application.”

---

### 1:45–2:20 — Register + Mark Sent

| | |
|--|--|
| **Sees** | Registrar candidatura → Mark sent after “external” submit |
| **Solves** | Clear semantics: register locally, then assert that a real send happened |
| **Engineering** | Job ≠ Application; Register ≠ Submit; no auto-apply |

**VO:** “Register creates the Application. Mark Sent is my explicit claim that I submitted outside ApplyFlow.”

---

### 2:20–2:45 — Lifecycle + Next Action

| | |
|--|--|
| **Sees** | State **Screening**, transition controls, next-action guidance |
| **Solves** | Explicit application tracking with state-machine semantics |
| **Engineering** | Canonical lifecycle; V2 path uses OCC + transactional Job sync; no fabricated timeline events |

**VO:** “Lifecycle is explicit. Next action is derived guidance — not a fake CRM task history.”

---

### 2:45–3:00 — Architecture / reliability

| | |
|--|--|
| **Sees** | Optional architecture diagram or short verbal map |
| **Solves** | Recruiter-visible trust: privacy boundary + test evidence |
| **Engineering** | Local-first default; optional tenant-scoped V2; TheirStack OFF shared; Vitest + Playwright baselines |

**VO:** “Default is local. Optional V2 is account-scoped Postgres with isolation E2E. TheirStack stays off on shared hosts to protect credits. Closed beta only — no public signup claim.”

---

## Demo data checklist

- [ ] Fictional candidate JSON (`portfolio-candidate-profile.json`)
- [ ] Provider fixtures (no live TheirStack charges)
- [ ] Prefer one coherent session (same jobs through queue → lifecycle)
- [ ] Applications table may use `Carregar demo` (fictional companies) for a denser multi-status view
- [ ] No real emails, notes, tokens, or beta-user data on screen

---

## Out of scope for this demo

- Career lab density / long dashboard scroll polish
- Toast system
- Live paid provider searches
- Public signup / billing
- Fabricated beta metrics
