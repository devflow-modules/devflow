# Real Resume Parsing

Deterministic, section-aware parsing for realistic Portuguese resumes copied from PDF or ATS documents. Addresses [issue #140](https://github.com/devflow-modules/devflow/issues/140).

**Operational status:** `P01 SCHEDULING PAUSED — REAL RESUME PARSING FIX IN PROGRESS`

---

## Problem

Before this fix, the simplified-input normalizer treated most non-empty lines as professional bullets. Real multi-section resumes (common in Brazil) produced:

| Symptom | Cause |
|---------|--------|
| Section headings counted as bullets | No heading catalog |
| Skills, education, languages as bullets | No section state machine |
| Contact lines in analysis | No contact exclusion |
| Artificially high bullet count | Every line promoted to bullet |
| Course hours / years as metrics | Weak metric classification |
| PDF line breaks split sentences | No conservative line joining |

**Example (sanitized Fixture F — before):**

```text
bullets: 40+
headings in bullets: 8+
skills in bullets: 12+
education/languages in bullets: yes
invalid fragments in bullets: yes
score: misleadingly low or noisy recommendations
```

**After section parser (Fixture F):**

```text
sections: summary, experience, projects, skills, education, languages, contact
experiences: 2
projects: 2
skills: 12–18
experience bullets: 6–12
headings in bullets: 0
contact in analysis: 0
confidence: high | medium | low
```

---

## Scope

**In scope**

- Deterministic parser in ApplyFlow (`career-pilot-resume-section-parser.ts`)
- Integration with `career-pilot-input-normalizer.ts` and `CareerSpecialistFields`
- Metric classification improvements in `@devflow/career-core` (`hasMeaningfulMetric`)
- Sanitized fixtures F–J and property invariants
- Participant review UI grouped by section (no contact/PII)
- Parser confidence and participant-facing summary counts

**Out of scope**

- External LLM, OpenAI, providers, OAuth, Gmail, Calendar, Nango
- Database, persistence, localStorage/sessionStorage/IndexedDB
- Production promotion or automation changes

---

## Section model

```typescript
type ResumeSectionKind =
  | "identity"
  | "summary"
  | "experience"
  | "projects"
  | "skills"
  | "education"
  | "certifications"
  | "languages"
  | "contact"
  | "links"
  | "unknown";
```

Headings are recognized case-insensitively with accent-normalized comparison. Trailing `:` accepted. Long descriptive lines are never headings.

Catalog covers Portuguese and English variants for: resumo, experiência, projetos, competências, educação, certificações, idiomas, contato, links.

---

## Parsing pipeline

```text
raw text
  → expandResumeLines (split, trim)
  → joinPdfBrokenLines (conservative merge)
  → splitEmbeddedSectionHeadings
  → state machine (currentSection)
  → section-specific handlers
  → ParsedResumeDocument
  → map to CareerSpecialistFields / resumeSnapshot
```

Intermediate structure:

```typescript
type ParsedResumeDocument = {
  identity?: { name?: string; targetRole?: string };
  summary?: string;
  experiences: ParsedResumeExperience[];
  projects: ParsedResumeProject[];
  skills: string[];
  education: string[];
  certifications: string[];
  languages: string[];
  contactLines: string[];
  linkLines: string[];
  unclassifiedLines: string[];
  diagnostics: ResumeParserDiagnostics;
};
```

---

## Experience detection

Reuses `isExperienceHeader()` and `parseExperienceHeader()` from `career-pilot-resume-line-parser.ts`.

Supported formats:

- Multi-line: company → title → period → bullets
- Inline: `Empresa — Cargo — 2022–2024`
- Pipe: `Cargo | Empresa | jan/2021 a dez/2023`
- Parenthetical period: `Empresa (2021–presente) — Cargo`

Company, title, and period never enter bullet arrays.

Limits: max 12 experiences, max 12 bullets per experience, max 60 valid bullets document-wide (truncation recorded in diagnostics, not shown to participant).

---

## Project detection

Projects are extracted in the `projects` section only — never merged into experiences.

```typescript
type ParsedResumeProject = {
  name?: string;
  description?: string;
  stack: string[];
  bullets: string[];
};
```

Mapped to `resumeProjectsJson` when the specialist contract supports it.

---

## Skills

In the skills section:

- Split by line, comma, `|`, `;`, `•`
- Match against `PILOT_SKILL_CATALOG` (`career-pilot-skill-catalog.ts`)
- Deduplicate and normalize casing
- Never promote skills to professional bullets
- Max 50 skills (defensive cap)

Fallback without headings: comma/pipe-separated catalog tokens on short lines.

---

## Education and languages

- Stored in structured arrays, not bullets
- Course duration (e.g. `40 horas`) is not a professional metric
- Graduation years are not metrics
- May appear as “informações identificadas” in review UI
- Omission does not reduce analyst score

---

## Metric classification

`classifyMetricContext()` in the section parser; `hasMeaningfulMetric()` in career-core.

**Counts as professional:** percentages, team size, scale, money, time saved in action context.

**Does not count:** isolated years, course hours, technical versions (`Node.js 20`, `React 19`), CEP, phone numbers.

```typescript
type MetricContext =
  | "professional_result"
  | "team_size"
  | "scale"
  | "time_saved"
  | "money"
  | "percentage"
  | "date"
  | "version"
  | "course_duration"
  | "contact_number"
  | "unknown";
```

---

## PDF line joining

Conservative merge when:

- Previous line lacks concluding punctuation
- Next line is not a heading, experience header, skill token, or contact
- Combined length stays reasonable

Does not merge across section boundaries.

---

## Confidence model

```typescript
type ResumeParseConfidence = "high" | "medium" | "low";
```

| Level | Signals |
|-------|---------|
| **high** | Summary + structured experiences + valid bullets + skills |
| **medium** | Partial sections, some unclassified lines |
| **low** | Many fragments, no experience grouping, high unclassified ratio |

Low confidence: participant copy warns that score should not be treated as definitive; review encouraged.

Participant summary example (no PII):

```text
Foram identificadas 3 experiências, 4 projetos e 15 competências.
```

---

## Privacy

- Resume text stays in memory only for the session
- No localStorage, sessionStorage, IndexedDB, database, or analytics content logging
- Contact lines excluded from `resumeSnapshot` and feedback payloads
- Fixtures use fictional data only (`realistic-multisection-resume.fixture.ts`)
- Diagnostics contain counts only — no raw lines in participant UI

---

## Limitations

- No LLM inference — structure must be recoverable deterministically
- Ambiguous PDF extraction may leave lines in `unclassifiedLines`
- Projects/education fields depend on specialist contract support
- Truncation limits may clip extremely long resumes (diagnostic only)
- English headings supported; primary target is Portuguese

---

## Validation fixtures

| Fixture | Purpose |
|---------|---------|
| A–E | PR #139 regressions (walkthrough) |
| F | Realistic multi-section resume |
| G | PDF broken lines |
| H | Resume without headings |
| I | Many skills, few experiences |
| J | Academic-heavy, little experience |

Property invariants (parametrized):

- Section heading never a bullet
- Contact line never a bullet
- Skill-only line never a bullet
- Date-only line never a bullet
- Experience header never a bullet
- Education line never an experience
- Course duration never a professional metric
- Technical version never a professional metric

Tests: `career-pilot-resume-section-parser.test.ts`, `career-pilot-input-normalizer.test.ts`, `career-pilot-walkthrough-fixtures.test.ts`, `resume-analyst-portuguese.test.ts`.

---

## Pilot impact

**Before P01 scheduling:** validate Preview with Fixture F on desktop (1440×900) and mobile (375×812).

**Gate to resume scheduling:**

```text
REAL RESUME PARSER READY FOR CONTENT REVIEW
```

**Blocker:**

```text
REAL RESUME PARSER BLOCKED
```

P01 remains paused until Preview content-quality walkthrough passes. Production unchanged (`1dfb9de`).

---

## Related docs

- [`RESUME-ANALYSIS-QUALITY.md`](./RESUME-ANALYSIS-QUALITY.md)
- [`SIMPLIFIED-INPUT-UX.md`](./SIMPLIFIED-INPUT-UX.md)
- [`PILOT-RUNBOOK.md`](./PILOT-RUNBOOK.md)
- [`P01-OPERATIONAL-KIT.md`](./P01-OPERATIONAL-KIT.md)
