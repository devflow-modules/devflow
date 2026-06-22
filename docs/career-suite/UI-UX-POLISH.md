# Career Suite UI/UX Product Polish

## Objective

Refine the participant-facing Career Suite pilot experience into a professional, candidate-oriented product surface — without changing endpoints, contracts, security behavior, or domain logic.

P01 scheduling was intentionally paused for this optional UI/UX polish cycle. Functional readiness remains **`READY FOR P01`** per [`PRODUCT-UX-READINESS-REVIEW.md`](./PRODUCT-UX-READINESS-REVIEW.md).

**Status (2026-06-22):** PR [#136](https://github.com/devflow-modules/devflow/pull/136) merged to `main` as squash `7e5dfbc`. Visual walkthrough approved (desktop + mobile, error recovery, feedback consent). P01 scheduling **resumed** after `main` Preview smoke.

## Visual direction

- Professional, trustworthy, contemporary, calm, action-oriented
- Design-system tokens (`--af-*`) as the base
- Reduced “developer dashboard” chrome in pilot mode
- No provider/OAuth/automation surfaces in the closed pilot

## Before

- Small typography (`text-[11px]`) on primary surfaces
- Violet/emerald-heavy cards resembling internal tooling
- Technical badges (read-only, in-memory, manual) visible to participants
- Dropdown for flow selection
- Plain text score lines (`Label: 72/100`)
- Minimal loading/error affordances
- Journey steps as static chips without interactive stepper

## After

- Product header with eyebrow, value proposition, three benefit steps, trust notice, dominant CTA
- Interactive journey stepper (`completed` / `active` / `upcoming`) with `aria-current="step"`
- Workflow panels per intent with grouped forms and 14px+ body text
- Button group for the three pilot flows (keyboard + mouse)
- Accessible loading region (`aria-live`) and recoverable error panel
- Result header with completion message and visual score indicator
- Numbered next-action list, structured findings, collapsed evidence and technical details
- Refined feedback card with explicit consent gate

## Component changes

| Component | Role |
|-----------|------|
| `CareerProductHeader` | Product header + CTA |
| `CareerJourneyStepper` | Three-step journey |
| `CareerAnalysisLoading` | In-flight analysis state |
| `CareerAnalysisError` | Recoverable error surface |
| `CareerResultHeader` | Result completion + primary score |
| `CareerScoreIndicator` | Accessible progress/score display |
| `CareerFindingGroup` | Strengths vs attention areas |
| `CareerActionList` | Numbered next actions |
| `CareerTrustNotice` | Privacy/trust copy |
| `career-polish-classes.ts` | Shared input/surface classes |

Updated: `career-pilot-experience.tsx`, `career-chat-workspace.tsx` (pilot presentation only), `career-pilot-result-view.tsx`, `career-pilot-feedback.tsx`, `career-pilot-content.ts`.

## Responsive behavior

- `max-w-4xl` product column on dashboard
- Full-width primary actions on mobile; stepper stacks vertically
- Touch-friendly controls (`min-h-[2.75rem]` intent buttons, larger checkboxes)
- Result cards constrained to readable width (`max-w-3xl`)

Validate viewports: **375×812**, **390×844**, **1280×800**, **1440×900**.

## Accessibility

- Heading order preserved
- `aria-current="step"` on active journey step
- `aria-live` on loading and feedback confirmation
- Real `<label>` associations on inputs
- Score `role="progressbar"` with textual value + qualitative label
- `<details>` for evidence and technical sections (keyboard operable)
- `prefers-reduced-motion` respected on spinners and transitions
- Primary content ≥ 14px; technical metadata ≥ 12–13px inside collapsed details

## States

| State | Surface |
|-------|---------|
| Idle | Form + optional status hint |
| Loading | `CareerAnalysisLoading` |
| Error | `CareerAnalysisError` + retry |
| Completed | `CareerPilotResultView` + feedback |
| Feedback submitted | Thank-you `role="status"` |

## Non-goals

- No endpoint, schema, or agent contract changes
- No provider/LLM/automation enablement
- No persistence, analytics, or auto-apply
- No Production branch changes
- No Framer Motion dependency

## Validation

- Vitest: pilot experience, journey, loading, score, result hierarchy, feedback consent
- `pnpm --filter applyflow test`
- `pnpm --filter applyflow build`
- Lint, button governance, design-system checks, secret scan
- Visual review completed on ApplyFlow Preview (desktop + mobile) — see PR #136 walkthrough
- `main` Preview smoke recorded after merge (`7e5dfbc`)

## Remaining P2/P3

- Copy harmonization in legacy dashboard panels below the pilot section
- DEMO.md screenshot refresh after visual review
- Optional motion on result reveal (post-review)
- Comment field on feedback (requires contract change — deferred)
