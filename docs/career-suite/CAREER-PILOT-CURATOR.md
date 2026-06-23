# Career Pilot Curator

Offline, deterministic moderator support for Career Suite closed pilots (P01–P05).

**Role:** `MODERATOR SUPPORT TOOL` — not an autonomous user researcher.

**Package:** `@devflow/career-core` · **CLI:** `pnpm pilot:curator`

---

## Purpose

Support the human moderator across the pilot lifecycle:

1. Prepare session protocol and preflight checklist
2. Answer moderator questions without inductive guidance
3. Structure raw notes into observations
4. Classify findings by severity (P0–P3)
5. Synthesize anonymized session output and a GitHub comment **draft**

The curator **does not** replace the moderator, talk to participants autonomously, or publish results.

---

## Why moderator support, not autonomous research

Aligned with [GOV.UK moderated usability testing](https://www.gov.uk/service-manual/user-research/using-moderated-usability-testing) and [W3C WAI evaluation guidance](https://www.w3.org/WAI/test-evaluate/preliminary/):

- Real users perform real tasks; the moderator observes and asks neutral questions.
- Automated tooling cannot replace judgment about comprehension, trust, or context.
- Findings must separate **observation**, **interpretation**, and **recommendation**.

The curator enforces that separation deterministically. It never calls external LLMs or providers.

---

## Architecture

```text
Curated methodology sources (GOV.UK, W3C, WCAG, ANPD, internal runbook)
        ↓
packages/career-core/src/research/
        ↓
runCareerPilotCurator()  ← core rules (single source of truth)
        ↓
packages/career-core/src/research/cli/  ← I/O adapter only
        ↓
Human approval
        ↓
External storage / sanitized GitHub comment
```

---

## Curated sources

Versioned in `packages/career-core/src/research/sources/`:

| ID | Source |
|----|--------|
| `govuk-moderated-usability` | GOV.UK Service Manual |
| `w3c-wai-evaluation` | W3C Web Accessibility Initiative |
| `wcag-2-2-reference` | WCAG 2.2 |
| `anpd-small-agent-security` | ANPD security guidance (minimization) |
| `career-suite-pilot-runbook` | Internal P01 kit + pilot runbook |

The CLI does **not** fetch external URLs at runtime.

---

## CLI commands

From repo root:

```bash
pnpm pilot:curator <command> [options]
```

Or:

```bash
pnpm --filter @devflow/career-core pilot:curator <command> [options]
```

| Command | Purpose |
|---------|---------|
| `prepare` | Protocol, preflight, opening script, tasks, severity model |
| `assist` | Neutral moderator guidance (`--question` or interactive) |
| `notes` | Raw notes → structured JSON (sanitized) |
| `classify` | Structured observations → findings JSON |
| `synthesize` | Session bundle → Markdown synthesis + GitHub draft |

Global flags:

- `--yes` — skip confirmations (CI/tests only)
- `--allow-repo-output` — allow writing inside the repository (discouraged)

---

## Session workflow

```text
1. prepare     → print protocol before session
2. (live)      → human moderator conducts session
3. assist      → on-demand during session (optional)
4. notes       → structure external note file
5. classify    → severity classification
6. synthesize  → decision draft + GitHub comment draft
7. human       → review, edit, approve
8. human       → post sanitized comment to issue #129
```

---

## Privacy model

Before any write, content passes through `sanitizePilotContent()`:

- Redacts email, phone, CPF/CNPJ, URLs, LinkedIn, addresses
- Blocks lines resembling full résumé or job descriptions
- Rejects inputs larger than **100 KB** (`INPUT_REJECTED_TOO_LARGE`)
- Never logs raw notes to stdout

Default output location:

```text
/tmp/career-pilot/<SESSION>/
```

Writing inside `packages/`, `apps/`, `docs/`, or repo root is **blocked** unless `--allow-repo-output` is set.

---

## Human approval

Every curator response includes:

```typescript
requiresHumanReview: true
```

Synthesis files include:

```text
REQUIRES HUMAN APPROVAL — NOT PUBLISHED
```

The CLI **never** calls `gh`, GitHub API, or opens issues.

---

## Severity model

| Level | Meaning | Typical decision |
|-------|---------|------------------|
| **P0** | Privacy leak, persistence, Production, external provider | `STOP PILOT` |
| **P1** | Main flow blocked, bad parsing, misleading score, HTTP errors | `FIX BEFORE NEXT PARTICIPANT` |
| **P2** | Confusing copy, moderate friction | Continue with observation |
| **P3** | Aesthetic preference, backlog | Continue |

---

## Decision model

`synthesize` may recommend:

```text
CONTINUE TO NEXT PARTICIPANT
FIX BEFORE NEXT PARTICIPANT
STOP PILOT
INSUFFICIENT EVIDENCE
```

Exit code **4** when recommendation is `INSUFFICIENT EVIDENCE`.

---

## Safe filesystem usage

```bash
# Recommended
pnpm pilot:curator notes \
  --session P01 \
  --participant P01 \
  --input ~/pilot/p01-notes.txt \
  --output /tmp/career-pilot/P01/p01-structured.json \
  --yes
```

Blocked by default:

```bash
--output ./packages/out.json   # UNSAFE_OUTPUT_PATH (exit 3)
```

---

## Examples

### Prepare

```bash
pnpm pilot:curator prepare \
  --session P01 \
  --participant P01 \
  --product-version main@d3de0e7 \
  --format terminal
```

### Assist

```bash
pnpm pilot:curator assist \
  --session P01 \
  --participant P01 \
  --question "O participante perguntou onde clicar."
```

### Full post-session chain

```bash
pnpm pilot:curator notes --session P01 --participant P01 \
  --input /tmp/p01-notes.txt \
  --output /tmp/career-pilot/P01/structured.json --yes

pnpm pilot:curator classify --session P01 --participant P01 \
  --input /tmp/career-pilot/P01/structured.json \
  --output /tmp/career-pilot/P01/findings.json --yes

pnpm pilot:curator synthesize --session P01 --participant P01 \
  --input /tmp/career-pilot/P01/session.json \
  --output /tmp/career-pilot/P01/synthesis.md --yes
```

---

## Limitations

- Deterministic pattern matching — not a substitute for moderator judgment
- Does not generalize across participants (`observado em X de Y`)
- Does not store session history between invocations
- Does not validate Preview health or preflight automatically
- Portuguese note patterns prioritized; extend rules in `research/` if needed

---

## Related docs

- [`P01-OPERATIONAL-KIT.md`](./P01-OPERATIONAL-KIT.md)
- [`PILOT-RUNBOOK.md`](./PILOT-RUNBOOK.md)
- Issue [#129](https://github.com/devflow-modules/devflow/issues/129)

**Operational status:** `P01 READY TO SCHEDULE` — CLI is moderator support only; it does not replace P01.
