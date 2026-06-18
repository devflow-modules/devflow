# Career Suite — Security Checklist (Production Pilot)

## Secrets

- [ ] No secret in client responses, health, observability, logs, or git diff.
- [ ] `OPENAI_API_KEY`, `LIBRECHAT_API_KEY`, `NANGO_SECRET_KEY`, `OPENCLAW_API_KEY` are
      server-side only and never serialized.
- [ ] `pnpm check:secrets` passes (scans tracked files; ignores `.env.example`; fails on
      real-looking secrets).
- [ ] No `Authorization` accepted from the client; no client-provided base URL/model/prompt.

## Boundaries preserved

- [ ] `safeForClient:true`, `hasToken:false`, `persisted:false`, `reviewRequired:true`,
      `toolExecutionOccurred:false` on every existing capability.
- [ ] No new agent, provider, automation, integration, or background job.
- [ ] OpenClaw stays disabled; `CAREER_AUTOMATION_PROVIDER=mock`.
- [ ] External integrations default-off; no silent fallback to a real provider.
- [ ] Health/livez/readyz never generate tokens, run tools, or persist.

## Operational endpoints

- [ ] `GET /career-system/health` — client-safe; no probe by default; `?probe=true` bounded.
- [ ] `GET /career-system/livez` — process-only; no provider/DB calls.
- [ ] `GET /career-system/readyz` — config/boundary checks only; no generation/agent/tool.
- [ ] `POST /career-feedback` — consent-gated; `GET` → `405`.
- [ ] `/dashboard/system-status` — dev-only, or gated by `CAREER_SYSTEM_STATUS_ENABLED` in prod.

## Data NEVER collected

raw prompt · raw response · full resume · full job description · email · calendar event · full
CareerBundle · API key · token · Authorization header · provider request id · chain-of-thought ·
device fingerprint · hidden analytics · required user email.

## Logging

- [ ] Structured JSON, sanitized; no `console.log` with payload.
- [ ] Stack traces only server-side in development; production exposes only `errorCode`.
- [ ] Correlation id is `career_<uuid>`, never derived from tokens/emails/provider ids.

## Persistence

- [ ] No silent persistence; feedback default repository is `discard`.
- [ ] Database component is optional; absent `DATABASE_URL` → component `disabled`.
