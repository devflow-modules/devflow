# Career Suite — Observability

Client-safe, deterministic-friendly observability. No invasive telemetry, no PII, no secrets,
no raw payloads, no persistence by default.

## Operational events

`CareerOperationalEvent` (`apps/applyflow/src/lib/career-system/observability.ts`) carries only
coarse operational metadata:

```ts
type CareerOperationalEvent = {
  eventName: string;       // allowlisted (see below)
  timestamp: string;
  route: string;
  outcome: "success" | "blocked" | "error";
  durationMs: number;
  environment: string;
  correlationId?: string;
  provider?: string;
  agent?: string;
  task?: string;
  errorCode?: string;
  externalProviderCalled?: boolean;
  persisted?: false;
  toolExecutionOccurred?: false;
};
```

Allowed event names: `career_agent_completed`, `career_agent_blocked`, `career_chat_completed`,
`career_llm_completed`, `career_llm_failed`, `career_provider_signal_loaded`,
`career_health_probe_completed`, `career_feedback_submitted`.

### Never recorded

raw prompt · raw response · full resume · full job description · email · calendar event · full
CareerBundle · API key · token · Authorization · provider request id · chain-of-thought.

`sanitizeCareerOperationalEvent()` enforces this: it drops non-allowlisted keys, forces
`persisted`/`toolExecutionOccurred` to `false`, and redacts secret-looking string values.

## Structured logger

`createCareerLogger()` emits a single sanitized JSON line per event, e.g.:

```json
{ "level": "info", "eventName": "career_agent_completed", "durationMs": 124, "outcome": "success", "safeForClient": true }
```

Rules: no `console.log` with payload; mandatory sanitization; stack traces only server-side in
development; production exposes only `errorCode`; no secret serialized; no full request/response.

## Correlation id

`createCareerCorrelationId()` produces `career_<uuid>`. It is propagated across route →
boundary → orchestrator → provider adapter → observability and may appear in client-safe
responses (and the `x-career-correlation-id` header) for support. It is **never** derived from a
provider request id, token, user email, or sensitive application id. Client-provided values are
only honored when they already match the strict `career_<uuid>` format.

## Metrics

`CareerMetricsAdapter` aggregates in memory only (provider `in_memory`); no Prometheus/Datadog/
paid service is added. Counters: `requests_total`, `requests_success`, `requests_blocked`,
`requests_error`, `duration_ms`, `external_provider_calls`, `agent_runs`, `llm_runs`,
`health_failures`, `feedback_submissions`. Not persisted; resets on restart. Surfaced on the
internal `/dashboard/system-status` page.
