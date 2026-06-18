# Career Suite — Production Readiness

Operational readiness for a **controlled production pilot** of the Career Suite. This PR adds
configuration validation, health/liveness/readiness, client-safe observability, in-memory
metrics, a consolidated feature-flag matrix, a pilot mode, explicit consent-gated feedback, an
internal diagnostic page, and build metadata. **No new agents, providers, automations,
integrations, background jobs, invasive telemetry, or silent persistence are introduced.**

## Principles preserved

`privacy-first` · `local-first` · `server-authoritative` · `deterministic-first` ·
`human-in-the-loop` · `default-off` for external integrations.

Every existing capability keeps: `safeForClient:true`, `hasToken:false`, `persisted:false`,
`reviewRequired:true`, `toolExecutionOccurred:false`.

## Environment matrix

`resolveCareerRuntimeEnvironment()` (`apps/applyflow/src/lib/career-system/environment.ts`)
resolves one of `development | test | preview | production` from an optional
`CAREER_RUNTIME_ENVIRONMENT` override → `VERCEL_ENV` → `NODE_ENV` (default `development`).

| Environment | Mocks | Real network | External providers | Missing required config |
|-------------|-------|--------------|--------------------|-------------------------|
| development | yes | allowed | only with explicit flags | feature stays off |
| test | yes | **never** | never | feature stays off |
| preview | yes | allowed | only with explicit flags | feature stays off |
| production | yes | allowed | only with explicit flags | **hard fail (never partial start)** |

No external flag turns a real provider on automatically, and there is **no silent fallback**
from a real provider to a mock — an enabled-but-misconfigured feature is reported as
`misconfigured`.

## Configuration validation

`resolveCareerComponentStatuses()` validates every component and returns a client-safe shape
(`component`, `enabled`, `configured`, `required`, `status`, optional `errorCode`). It never
returns an API key, token, private base URL, Authorization header, provider id, or raw env
value. In production, `resolveCareerConfigBlockers()` makes an enabled-but-misconfigured
component a hard readiness failure.

Components: `career_agents` (required, deterministic core), `career_chat`, `career_llm`,
`career_automation`, `provider_metadata` (Nango), `database` (optional — local-first).

## Health / liveness / readiness

| Endpoint | Purpose | External calls |
|----------|---------|----------------|
| `GET /career-system/health` | Aggregated client-safe component health | none by default; `?probe=true` bounded probe |
| `GET /career-system/livez` | Process responds | never |
| `GET /career-system/readyz` | App init + required config valid + boundaries loaded + DB (if configured) | never |

All reject `POST` with `405`. No token generation, tool execution, provider payload, or
persistence. `health` returns `503` when `unhealthy`; `readyz` returns `503` when `not_ready`.

See [`OBSERVABILITY.md`](./OBSERVABILITY.md) for events/metrics and
[`DEPLOYMENT.md`](./DEPLOYMENT.md) for deploy wiring.

## Feature flags

See the consolidated matrix in [`DEPLOYMENT.md`](./DEPLOYMENT.md#feature-flag-matrix). OpenClaw
stays disabled; `CAREER_AUTOMATION_PROVIDER=mock`; OpenAI and the LibreChat transport are
opt-in; no client-side flag contains a secret.

## Pilot mode & feedback

`CAREER_PILOT_MODE` (server) and `NEXT_PUBLIC_CAREER_PILOT_MODE` (client UI) enable a pilot
badge, a human-review notice ("no application is ever submitted; suggestions may need
correction; actions are reversible"), and a feedback control. Feedback is explicit and
consent-gated via `POST /career-feedback`; see [`PILOT-VALIDATION.md`](./PILOT-VALIDATION.md).

## Data never collected

See [`SECURITY-CHECKLIST.md`](./SECURITY-CHECKLIST.md). In short: no raw prompt/response, no
full resume/job description, no email/calendar content, no full CareerBundle, no API
key/token/Authorization/provider request id, no chain-of-thought, no hidden analytics/fingerprint.

## Acceptance criteria

build passes · tests pass · health/readyz/livez work · logs are client-safe · correlationId
works · pilot mode works · feedback respects consent · secret scan passes · no real integration
on by default · OpenClaw stays off · no silent persistence · no new tool execution · no new mutation.
