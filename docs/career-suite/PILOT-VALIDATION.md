# Career Suite — Pilot Validation

How to run and validate the controlled user pilot.

## Enabling pilot mode

Full preview matrix (flags, build metadata, adapter vs transport): see
[`DEPLOYMENT.md` § Preview environment](./DEPLOYMENT.md#preview-environment-controlled-pilot).

Minimum pilot UI flags:

```env
CAREER_PILOT_MODE=true
NEXT_PUBLIC_CAREER_PILOT_MODE=true
LIBRECHAT_ADAPTER_ENABLED=true
LIBRECHAT_TRANSPORT_ENABLED=false
```

Career Chat requires `LIBRECHAT_ADAPTER_ENABLED=true` (in-process boundary). Keep transport off
unless an external LibreChat server is intentionally configured server-side.

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

### Protected Preview smoke

If the Vercel preview returns **401** to plain `curl`, the deployment is likely SSO-protected.
Do **not** disable Deployment Protection. Use [`vercel curl`](./DEPLOYMENT.md#protected-vercel-previews-smoke-without-disabling-protection)
from a linked `devflow-applyflow` project, or validate UI in an authenticated browser session.
Never commit protection-bypass tokens. Record **`PREVIEW PROTECTED`** in the operator report.

Production smoke does **not** substitute Preview validation during the pilot.

## Response contract notes (post-pilot debt)

| Surface | Execution guarantee field |
|---------|---------------------------|
| `POST /career-feedback` | `toolExecutionOccurred: false` (explicit) |
| `POST /career-chat/librechat` | `executedExternally: false` (explicit); proposals never executed |

`CareerChatResponse` intentionally omits `toolExecutionOccurred`; absence on Career Chat is
**not** a contract break. Tool non-execution is covered by `executedExternally: false`,
`persisted: false`, `reviewRequired: true`, and proposal statuses (`ready_for_review`,
`approval_required`). Aligning field names across surfaces is optional post-pilot cleanup.

## What success looks like

- Users complete resume/ATS/strategy/interview flows and submit feedback.
- No accidental side effects (no apply, no mutation, no persistence, no tool execution).
- Operators can read aggregate health/metrics on `/dashboard/system-status` without secrets.
