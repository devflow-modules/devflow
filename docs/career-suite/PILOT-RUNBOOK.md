# Career Suite — Closed Pilot Runbook

Operational plan for a **seven-day closed cohort** on the controlled ApplyFlow Preview. This
document complements — and does not replace — [`PILOT-VALIDATION.md`](./PILOT-VALIDATION.md)
(technical smoke) and [`DEPLOYMENT.md`](./DEPLOYMENT.md) (environment matrix).

**Related:** [`README.md`](./README.md) · [`PRODUCT-UX-READINESS-REVIEW.md`](./PRODUCT-UX-READINESS-REVIEW.md) ·
[`P01-OPERATIONAL-KIT.md`](./P01-OPERATIONAL-KIT.md) · [`SECURITY-CHECKLIST.md`](./SECURITY-CHECKLIST.md) · [`OBSERVABILITY.md`](./OBSERVABILITY.md)

---

## Product & UX gate (before P01)

Portuguese resume analysis quality fix merged in PR [#139](https://github.com/devflow-modules/devflow/pull/139) (`main` @ `4d8d332`, closes #138). Simplified inputs merged in PR #137.

| Gate | Source |
|------|--------|
| Product/UX audit complete | [`PRODUCT-UX-READINESS-REVIEW.md`](./PRODUCT-UX-READINESS-REVIEW.md) |
| UI/UX polish merged | PR [#136](https://github.com/devflow-modules/devflow/pull/136) → `main` @ `7e5dfbc` |
| Visual walkthrough approved | Desktop 1440/1280, mobile 375/390, error recovery, feedback consent |
| No open P1 UX blockers | W-01/W-02 resolved; W-04 non-blocking P2 outside pilot surface |
| Technical Preview smoke | [`PILOT-VALIDATION.md`](./PILOT-VALIDATION.md) + `main` smoke 2026-06-22 |

Current decision (2026-06-23): **`P01 READY TO SCHEDULE`** — PR [#141](https://github.com/devflow-modules/devflow/pull/141) merged on `main` @ `b9fc3b2` (closes [#140](https://github.com/devflow-modules/devflow/issues/140)); Fixture F post-merge smoke passed on `main` Preview.

**Operational status:** `P01 READY TO SCHEDULE` — see [`REAL-RESUME-PARSING.md`](./REAL-RESUME-PARSING.md) and [`P01-OPERATIONAL-KIT.md`](./P01-OPERATIONAL-KIT.md).

---

## Objective

Validate whether the Career Suite delivers **practical, understandable, and safe** value for
people seeking employment — **before** enabling external providers or paid AI.

Success means participants can complete resume analysis, ATS compatibility review, and career
strategy planning with deterministic agents, understand the output without technical help, and
trust that **no application is submitted** and **no data is stored silently**.

---

## Duration

**7 calendar days** from the first participant session to the Go / Iterate / No-Go review.

---

## Participants

| Parameter | Value |
|-----------|-------|
| Cohort size | **3 to 5** users |
| Session length | **20–30 minutes** each |
| Identifiers in this repo | `P01` … `P05` only — **no real names** |

### Recommended profile

- Professionals actively seeking re-employment or a role change
- Has an existing résumé (or equivalent bullet list) to analyze
- Has **at least one real job posting** to compare for ATS scenario
- Available for a single guided session (~30 min)
- Provides **explicit consent** before any feedback is recorded
- Understands that résumé/job text stays in the browser session unless they choose otherwise

### Excluded from this pilot

| Capability | Status |
|------------|--------|
| OpenAI (real) | Off |
| LibreChat transport (external) | Off |
| Nango / Gmail / Google Calendar | Off |
| OpenClaw | Off |
| Auto-apply | Off |
| External automation | Off |
| Silent résumé or job persistence | Off |
| Background jobs | Off |
| Production deployment | Off |

**Included flows only:** `analyze_resume` · `analyze_ats_compatibility` · `plan_career_strategy`

---

## Mandatory scenarios

### Scenario 1 — Resume analysis (`analyze_resume`)

Participant provides a **minimal résumé snapshot** (summary, skills, experience bullets — not a
full document upload requirement) and reviews:

- Structural score
- Strengths
- Weaknesses
- Missing evidence
- Recommendations
- Risks
- Suggested next actions

**Observer notes:** Was the score explained? Did proposals appear as review-only?

### Scenario 2 — ATS compatibility (`analyze_ats_compatibility`)

Participant compares résumé snapshot against a **real job posting** (requirements/keywords they
paste manually) and reviews:

- Compatibility score (0–100)
- Keywords matched / missing
- Required requirements covered / gaps
- Parsing risks (if surfaced)
- Keyword-stuffing warnings

**Observer notes:** Did the participant relate the score to their actual posting?

### Scenario 3 — Career strategy (`plan_career_strategy`)

Participant states a career goal (target roles, availability) and reviews:

- Positioning summary
- Priority roles (≤ 3)
- Priority skills
- Portfolio strategy
- Application strategy
- 30 / 60 / 90-day plan outline
- Risks

**Observer notes:** Is the plan actionable without promising outcomes?

---

## Security rules (non-negotiable)

- **No application submitted** — ever
- **No proposal executed** — all remain `ready_for_review` / `approval_required`
- **Human review required** — pilot badge and notice visible
- **No hiring guarantee** — copy must not imply employment outcomes
- **No data saved without consent** — feedback uses `consentToStore`; default repository discards
- **No external providers** — verify `/career-system/health?probe=true` shows providers disabled
- **No tokens** in UI or network responses
- **No irreversible upload** — session inputs only; do not ask participants to upload PDFs to the repo
- **Participant may stop** at any time without penalty

---

## Success criteria (pilot hypotheses)

These are **pilot targets**, not commercial KPIs.

| Metric | Initial target |
|--------|---------------:|
| Participants who complete all 3 flows | ≥ 80% |
| Participants who understand results without technical help | ≥ 80% |
| Participants who find ≥ 1 recommendation useful | ≥ 70% |
| Participants who would trust repeating the analysis | ≥ 70% |
| Blocking failures (P1) during sessions | 0 |
| Secret or PII exposure incidents (P0) | 0 |
| Undesired external executions | 0 |
| Persistence without consent | 0 |

---

## Explicit feedback questionnaire

Administer **after each session** (verbal or shared form — never commit responses to Git).

Use **1–5 scale** for quantitative items (1 = strongly disagree · 5 = strongly agree).

| # | Question | Scale |
|---|----------|-------|
| 1 | Was the result easy to understand? | 1–5 |
| 2 | Which recommendation was most useful? | Free text (short) |
| 3 | Did any recommendation seem incorrect or generic? | Free text (short) |
| 4 | Did the score seem coherent? | 1–5 |
| 5 | Would you trust using this again? | 1–5 |
| 6 | Would you pay for a more complete version? | Yes / No / Maybe |
| 7 | What functionality was missing? | Free text (optional) |
| 8 | Was it clear that **no application would be submitted**? | 1–5 |
| 9 | Do you authorize storing this feedback? | Yes / No |
| 10 | Optional comment | Free text (≤ 1000 chars) |

**Do not require:** email, phone, full résumé, current employer, or government ID.

When consent is **Yes**, submit via in-app `POST /career-feedback` with `consentToStore: true`
(category: `resume` | `ats` | `career_strategy` as appropriate). When **No**, still allow
`consentToStore: false` (discarded server-side) or record counts only in the tracking table below.

---

## Session tracking table

Record **anonymous** rows only. Store the filled table outside Git (e.g. encrypted ops doc).

| Participant | Date | Flows completed | Failure? | Utility 1–5 | Clarity 1–5 | Confidence 1–5 | Would pay? | Consented feedback? |
|-------------|------|-----------------|----------|------------:|------------:|-------------:|------------|---------------------|
| P01 | | ☐ resume ☐ ATS ☐ strategy | | | | | | |
| P02 | | ☐ resume ☐ ATS ☐ strategy | | | | | | |
| P03 | | ☐ resume ☐ ATS ☐ strategy | | | | | | |
| P04 | | ☐ resume ☐ ATS ☐ strategy | | | | | | |
| P05 | | ☐ resume ☐ ATS ☐ strategy | | | | | | |

**Flows completed** = participant reached a `completed` agent result for that intent without P1
blocker.

---

## Per-session checklist

### Before session

- [ ] Product/UX readiness decision is **`READY FOR P01`** ([`PRODUCT-UX-READINESS-REVIEW.md`](./PRODUCT-UX-READINESS-REVIEW.md))
- [ ] Preview deployment **Ready** (`devflow-applyflow`)
- [ ] `GET /career-system/readyz` → `environment: preview`, `blockers: []`
- [ ] `/dashboard/system-status` shows current commit (via `VERCEL_GIT_COMMIT_SHA`)
- [ ] `GET /career-system/health?probe=true` → LLM, automation, database, providers **disabled**
- [ ] No prior participant data visible in the browser (fresh session / incognito)
- [ ] Pilot owner has [`DEPLOYMENT.md` § Protected Preview](./DEPLOYMENT.md#protected-vercel-previews-smoke-without-disabling-protection) access if SSO-protected

### During session

- [ ] Observe; avoid over-directing on first pass
- [ ] Note confusion points (UX copy, score, layout)
- [ ] Do **not** manually fix agent output during first use
- [ ] Confirm tool proposals are **not** executed
- [ ] Confirm pilot notice visible (no auto-submit)
- [ ] Obtain consent **before** recording feedback

### After session

- [ ] Clear local inputs / close incognito window
- [ ] Record only **consented** feedback in operational store
- [ ] Classify any incident (see severity below)
- [ ] **Do not** copy résumé or job text into GitHub issues or commits

---

## Incident severity

### P0 — Critical

- Secret exposed in UI, logs, or network
- Data persisted without consent
- Application or message sent to external system
- External provider called without explicit enablement
- Cross-participant data visible

**Action:** **Stop pilot immediately.** File P0 issue. Do not schedule new sessions until resolved.

### P1 — Blocking

- Primary flow cannot complete (persistent 5xx or blocked state)
- Corrupted or empty agent result
- Preview unavailable for scheduled session
- Recurrent server errors

**Action:** **Suspend new sessions** until fix deployed to Preview. Existing data: discard.

### P2 — Relevant

- Confusing copy or layout
- Score perceived as incoherent (document participant quote, not résumé content)
- Low-value proposal
- Non-blocking visual defect

**Action:** Log for post-pilot prioritization. Session may continue.

### P3 — Improvement

- UX suggestion, new feature idea, copy refinement

**Action:** Backlog. No pilot interruption.

---

## Permitted metrics (no invasive telemetry)

During the pilot, operators may use **only**:

| Source | Examples |
|--------|----------|
| Session counts | # sessions scheduled, # completed |
| Flow completion | 3/3 flows per participant |
| HTTP status | `livez` / `readyz` / `health` / chat `200` vs errors |
| Approximate duration | Wall-clock per session (operator note) |
| Explicit ratings | Questionnaire 1–5 |
| Error categories | P0–P3 classification |
| In-memory adapters | `/dashboard/system-status` counters (reset on deploy) |
| Consented feedback | `POST /career-feedback` with `consentToStore: true` |

**Do not add** for this pilot: invasive analytics, browser fingerprinting, hidden tracking, automatic
screen recording, session replay, marketing cookies, or silent storage.

---

## Go / Iterate / No-Go (day 7)

Review the tracking table, incident log, and success criteria.

### GO — next stage

- Zero **P0** incidents
- Zero **open P1** at decision time
- ≥ **3** participants completed
- ≥ **80%** complete all three flows
- ≥ **70%** report at least one useful recommendation
- Qualitative feedback suggests a **real problem** and plausible repeat use
- Team agrees controlled expansion (e.g. more cohorts or optional LLM) is justified **without**
  skipping human review

### ITERATE

- Perceived value exists but clarity or UX below targets
- No critical privacy or trust risk
- Fixes are small and measurable (copy, scoring explanation, layout)
- Schedule a second 7-day cohort after changes

### NO-GO

- Low perceived utility across participants
- Participants systematically do not understand outputs
- Recommendations feel incoherent or untrustworthy
- Privacy or trust risk unacceptable
- Basic flows only work with external providers (violates current architecture)

Document the decision in the [pilot tracking issue](#github-tracking-issue) (checkboxes below).

---

## GitHub tracking issue

Create or use issue: **`pilot: validate Career Suite with closed user cohort`**

Labels (existing): `documentation`, `applyflow`, `needs:smoke-routes`

Link this runbook in the issue body. Update checkboxes as the pilot progresses.

---

## Operator quick reference

| Check | Command / URL |
|-------|----------------|
| Preview URL | Vercel dashboard → `devflow-applyflow` → latest **Preview** on `main` |
| Protected access | `vercel curl --deployment "<url>" --yes /career-system/readyz` |
| System status | `/dashboard/system-status` |
| Career Chat | `/dashboard` → **Career Suite** section (pilot mode) → three specialist intents |
| Feedback API | `POST /career-feedback` — see [`PILOT-VALIDATION.md`](./PILOT-VALIDATION.md) |

**Production:** not in scope. Do not promote `production` branch or use `vercel --prod` during this
pilot.
