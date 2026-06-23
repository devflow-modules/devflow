# Career Suite — Resume Analysis Quality (Portuguese)

Quality gate before **P01** closed pilot. Addresses [issue #138](https://github.com/devflow-modules/devflow/issues/138).

**Operational status:** `P01 SCHEDULING PAUSED — REAL RESUME PARSING FIX IN PROGRESS` — section-aware parser in PR for [#140](https://github.com/devflow-modules/devflow/issues/140); P01 scheduling paused until Preview validation. Prior quality fix merged in PR #139 (`main` @ `aba7381`, closes #138).

---

## Problem found (pre-fix)

Deterministic `resume_analyst` produced poor participant-facing output for Portuguese resumes:

| Symptom | Cause |
|---------|--------|
| `Desenvolvi`, `Reduzi`, `Liderei` not recognized as action verbs | English-only verb catalog |
| Professional summary empty | Simplified input did not populate `resumeSnapshot.summary` |
| Artificially low score (~35) | Old rubric penalized missing projects/education sections |
| Participant content in English | Agent summary and labels not localized |
| Technical trace visible in pilot | UI exposed orchestration codes to participants |
| Generic recommendations | Vague bullets received one-size-fits-all guidance |

**Example (Maria / TechCorp fixture) — before:**

```text
score: ~35
summary: absent
vague bullets flagged: 5
participant language: English
trace: visible in pilot surface
```

**After fix (same fixture):**

```text
score: 65–85 (normalized rubric)
summary: "Desenvolvedora de Software com experiência em backend e integrações."
measurable results: 2 (30%, 4 pessoas)
action verbs: Desenvolvi, Reduzi, Liderei recognized
participant language: Portuguese
trace: hidden on pilot participant surface
```

---

## Portuguese action verbs

Catalog in `packages/career-core/src/career-agents/agents/resume-analyst.ts`:

- **1ª pessoa:** desenvolvi, implementei, criei, liderei, reduzi, aumentei, automatizei, migrei, otimizei, entreguei, projetei, arquitetei, refatorei, gerenciei, coordenei, estruturei, integrei, construí, melhorei, participei
- **3ª pessoa:** desenvolveu, implementou, criou, liderou, reduziu, automatizou, otimizou, integrou, construiu, melhorou, …

**Matching rules:**

- Case-insensitive first token
- Strip leading/trailing punctuation (`Desenvolvi,` → `desenvolvi`)
- Preserve accents (`construí`)
- Exact token match only — no partial matches (`desenvolvimento` rejected)
- Nouns like `desenvolvimento`, `experiência`, `liderança` are never verbs

---

## Professional summary extraction

`extractProfessionalSummary()` in `career-pilot-input-normalizer.ts`:

1. Reads the first descriptive paragraph **before** section headers (`Experiência profissional`, etc.)
2. Stops at action-verb lines (experience bullets)
3. Populates `resumeSnapshot.summary` via `buildSpecialistAnalysisInput()`
4. Excludes the same text from bullet extraction
5. Does **not** use LLM summarization — original text preserved (max 500 chars)

---

## Scoring rubric (normalized)

Only **applicable** dimensions contribute to the denominator:

| Dimension | Max points |
|-----------|------------|
| Resumo profissional | 15 |
| Skills | 20 |
| Qualidade dos bullets | 30 |
| Resultados mensuráveis | 25 |
| Evidência de contexto/liderança | 10 |
| **Total** | **100** |

```text
score = (pontos obtidos / pontos aplicáveis) × 100
```

**Optional sections:** projects and education are **never penalized** when absent from simplified input.

**Score bands (fixtures):**

| Profile | Expected range |
|---------|----------------|
| Empty / very weak | 0–30 |
| Basic, no metrics | 30–55 |
| Coherent skills + verbs | 55–75 |
| Strong with verifiable metrics | 70–90 |

---

## Participant localization

All agent output for `analyze_resume` is Portuguese:

- Summary, strengths, weaknesses, findings, recommendations, risks, nextActions
- Bullet recommendations cite the original text and explain what is strong or missing
- **Never invent metrics** — suggestions say “somente se esses dados forem reais”

English resumes remain supported (regression fixture D).

---

## Technical details visibility

| Surface | Trace / codes / raw evidence |
|---------|------------------------------|
| Pilot participant (`participantSurface=true`) | **Hidden** |
| Developer diagnostic (`participantSurface=false`) | Available |
| `/dashboard/system-status` | Available |
| Backend orchestrator | Unchanged (observability preserved) |

---

## Deterministic limits

- No external LLM, providers, OAuth, database, or persistence
- Parser does not infer impact beyond explicit digits, `%`, or people counts
- Simplified input may omit projects/education — rubric adapts
- Human review always required (`reviewRequired: true`)

---

## Tests

| Package | File |
|---------|------|
| `@devflow/career-core` | `resume-analyst-portuguese.test.ts` (fixtures A–E) |
| `@devflow/career-core` | `specialist-agents.test.ts` |
| `applyflow` | `career-pilot-resume-section-parser.test.ts` (fixtures F–J, invariants) |
| `applyflow` | `career-pilot-input-normalizer.test.ts` |
| `applyflow` | `career-pilot-result-mapper.test.ts` |
| `applyflow` | `career-pilot-result-view.test.tsx` |

---

## Related docs

- [`REAL-RESUME-PARSING.md`](./REAL-RESUME-PARSING.md) — section-aware parser (issue #140)
- [`SIMPLIFIED-INPUT-UX.md`](./SIMPLIFIED-INPUT-UX.md)
- [`PILOT-RUNBOOK.md`](./PILOT-RUNBOOK.md)
- [`agents/RESUME-AGENT.md`](./agents/RESUME-AGENT.md) — update when agent contract changes

---

## Infrastructure note (P2, out of scope)

Vercel `turbo-ignore applyflow` may skip Preview deployments for ApplyFlow PRs. Tracked separately; does not block this quality fix.
