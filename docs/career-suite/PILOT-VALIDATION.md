# Career Suite — Pilot Validation

How to run and validate the controlled user pilot.

## Enabling pilot mode

```env
CAREER_PILOT_MODE=true
NEXT_PUBLIC_CAREER_PILOT_MODE=true
```

When active, the Career Chat Workspace shows:

- a **Pilot** badge;
- a human-review notice: every suggestion requires human review, **no application is ever
  submitted**, suggestions may need correction, and all actions are reversible;
- a feedback control after a completed result.

Pilot mode does **not** change permissions, boundaries, policies, or approvals.

## Explicit feedback

`POST /career-feedback` (`GET` → `405`). Contract:

```ts
{
  rating: "helpful" | "partially_helpful" | "not_helpful";
  category: "resume" | "ats" | "interview" | "career_strategy" | "application_fit" | "system";
  comment?: string;        // bounded (<= 1000 chars)
  correlationId?: string;  // career_<uuid>
  consentToStore: boolean;
}
```

Rules:

- stored **only** when `consentToStore: true`; otherwise validated and **discarded**;
- comment is length-limited; no resume, no full job description, no provider payload;
- no required email, no fingerprint, no hidden analytics;
- default repository is `discard` (`CareerFeedbackRepository`) — no new DB infrastructure;
  nothing is persisted unless a real repository is wired in later;
- response is client-safe: `reviewRequired:true`, `safeForClient:true`, `hasToken:false`,
  `toolExecutionOccurred:false`, and `persisted` reflects whether anything was actually stored.

## Smoke checklist

For `analyze_resume`, `analyze_ats_compatibility`, `plan_career_strategy`,
`prepare_interview`, `analyze_application_fit`, `analyze_profile_gaps`:

- correct agent + deterministic result; proposals present but never executed;
- `reviewRequired:true`, `persisted:false`, `toolExecutionOccurred:false`;
- feedback without consent is discarded; with consent and `discard` repo it stores nothing;
- `health` (no probe), `livez`, `readyz` return expected status;
- no secret in Network/Console/response; correlation id present;
- UI works on desktop and mobile.

## What success looks like

- Users complete resume/ATS/strategy/interview flows and submit feedback.
- No accidental side effects (no apply, no mutation, no persistence, no tool execution).
- Operators can read aggregate health/metrics on `/dashboard/system-status` without secrets.
