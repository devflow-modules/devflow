# Provider-Derived Runtime Preview

ApplyFlow includes an explicitly triggered, read-only preview of client-safe derived signals from verified Gmail and Calendar runtime connections.

The preview is ephemeral, requires user consent and verified connections, does not retain raw provider data, does not persist results, and does not modify CareerBundle or applications automatically.

## Status

| Item | State |
|------|--------|
| Gmail read-only Nango runtime | **Implemented** |
| Calendar read-only Nango runtime | **Implemented** |
| Provider-derived runtime composition | **Implemented** |
| Opt-in runtime preview (HTTP + UI) | **Implemented** |
| Persistence / background sync | **Not implemented** |
| CareerBundle auto-enrichment | **Not implemented** |

## Flow

```txt
user confirms explicit consent
  → user verifies Gmail connection (server-side)
  → user verifies Calendar connection (server-side)
  → user clicks "Run read-only preview"
  → POST /provider-runtime/nango/derived-preview
  → server verifies Gmail connection (Nango)
  → server verifies Calendar connection (Nango)
  → executeApplyFlowGmailReadOnlyRuntimeBoundary
  → executeApplyFlowCalendarReadOnlyRuntimeBoundary
  → executeApplyFlowProviderDerivedRuntimeBoundary
  → ProviderDerivedRuntimeCompositionResult (client-safe)
```

**Trust boundary:** Client connection state controls button availability only. The preview route verifies both Nango connections independently on the server. Client-provided connection booleans are never trusted for authorization.

## Route

| Property | Value |
|----------|--------|
| Path | `POST /provider-runtime/nango/derived-preview` |
| Owner | ApplyFlow / Career Suite provider runtime |
| Server-side | yes |
| Client-safe response | yes |
| Requires feature flags | yes |
| Requires explicit consent | yes |
| Requires verified connections | yes (Gmail + Calendar) |
| Imports provider data | no (ephemeral metadata processing only) |
| Persists provider payload | no |
| Returns OAuth tokens | no |
| Mutates CareerBundle | no |
| Background sync | no |

Implementation: `apps/applyflow/src/app/provider-runtime/nango/derived-preview/route.ts`

## Request contract

```ts
export type ProviderDerivedRuntimePreviewRequest = {
  explicitConsent: true;
  window?: {
    from?: string;
    to?: string;
  };
  limits: {
    maxMessages: number; // 1–50
    maxEvents: number;   // 1–50
  };
};
```

UI defaults: `maxMessages: 10`, `maxEvents: 10`.

Blocked before runtime when consent is missing, server-side Gmail/Calendar verification is not `connected`, limits are invalid, or the window is invalid. Invalid requests do not call verifiers or Gmail/Calendar boundaries.

Server-side verification uses `handleApplyFlowNangoConnectionVerification` with `createNangoConnectionVerificationProvider` — the same boundary as `POST /provider-runtime/nango/connection-status`. Verification runs in parallel before any runtime execution.

## Response

Returns only `ProviderDerivedRuntimeCompositionResult`:

- `status`: `completed` \| `partial` \| `blocked` \| `error`
- `processedMessageCount` / `processedEventCount`
- `signals` (derived, review-required)
- `summary` (aggregated flags and counts)
- sanitized `warnings` and `messages`

Never includes: Gmail/Calendar metadata, bodies, snippets, subjects, descriptions, locations, meeting links, message/thread/event/calendar IDs, connection IDs, `end_user_id`, OAuth tokens, or Nango payloads.

HTTP status (conservative):

| Case | Status |
|------|--------|
| completed / partial / runtime blocked | 200 |
| missing consent | 403 |
| invalid JSON / limits / window | 400 |
| internal failure (sanitized) | 500 |

## UI

`ProviderDerivedRuntimePreviewPanel` in the consent/status dashboard:

- Badges: Read-only, Ephemeral, User review required, No raw provider data retained, No CareerBundle changes
- Button **Run read-only preview** enabled only when consent is active and both Gmail and Calendar server verification report `connected` (UX gate only — server re-verifies on every request)
- States: idle, loading, completed, partial, blocked, error
- Preview clears when consent or verification changes (no localStorage/sessionStorage)
- Execution only on explicit click — no auto-run, polling, or background refresh

## Boundaries

| Module | Role |
|--------|------|
| `provider-derived-runtime-preview-boundary.ts` | Request parsing, server-side connection verification, preview orchestration |
| `gmail-readonly-runtime-boundary.ts` | Gmail runtime (flags, consent, SDK, sanitization) |
| `calendar-readonly-runtime-boundary.ts` | Calendar runtime |
| `provider-derived-runtime-boundary.ts` | Composition entry |
| `provider-derived-runtime-composition.ts` | Parallel execution + signal aggregation |

Environment and gates reuse `readApplyFlowNangoConnectSessionEnv` and existing Nango integration IDs — not duplicated in the preview route.

## What this does not do

- Does not persist preview results
- Does not write to database, localStorage, or sessionStorage
- Does not run background sync, cron, or webhooks
- Does not mutate or export CareerBundle automatically
- Does not integrate with Interview Lab
- Does not auto-update applications, auto-send, or auto-submit
- Does not call LLM / OpenAI
