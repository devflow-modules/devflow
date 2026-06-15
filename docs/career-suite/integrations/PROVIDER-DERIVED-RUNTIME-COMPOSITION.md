# Provider-Derived Runtime Composition

Career Suite can compose client-safe, review-required derived signals from server-only Gmail and Calendar read-only runtime boundaries.

The runtime composition does not retain raw provider data, expose OAuth credentials, modify CareerBundle, persist results, run in the background, or update applications automatically.

## Status

| Item | State |
|------|--------|
| Gmail read-only Nango runtime | **Implemented** — `executeApplyFlowGmailReadOnlyRuntimeBoundary` |
| Calendar read-only Nango runtime | **Implemented** — `executeApplyFlowCalendarReadOnlyRuntimeBoundary` |
| Provider-derived runtime composition | **Implemented** — `executeApplyFlowProviderDerivedRuntimeBoundary` |
| Opt-in runtime preview (HTTP + UI) | **Implemented** — `POST /provider-runtime/nango/derived-preview` (server-side connection verification before composition) |
| In-memory signal review workflow | **Implemented** — see [PROVIDER-DERIVED-RUNTIME-REVIEW.md](./PROVIDER-DERIVED-RUNTIME-REVIEW.md) |
| CareerBundle auto-enrichment | **Not implemented** |
| Background sync | **Not implemented** |

## Architecture

```txt
executeApplyFlowProviderDerivedRuntimeBoundary
  → executeProviderDerivedRuntimeComposition
    → Promise.allSettled(executeGmail, executeCalendar)
    → validate GmailReadOnlyAdapterResult / CalendarReadOnlyAdapterResult invariants
    → composeProviderDerivedSignals (career-sync)
    → summarizeProviderDerivedSignals (career-sync)
    → ProviderDerivedRuntimeCompositionResult
```

Composed signal IDs use the runtime-neutral format — see [PROVIDER-DERIVED-SIGNAL-ID-CONTRACT.md](./PROVIDER-DERIVED-SIGNAL-ID-CONTRACT.md).

ApplyFlow location: `apps/applyflow/src/lib/provider-runtime/`

| Module | Role |
|--------|------|
| `provider-derived-runtime-composition.ts` | Parallel execution, safety validation, signal composition |
| `provider-derived-runtime-boundary.ts` | Thin orchestration entry point |

**Gates remain in individual boundaries.** This layer does not read `process.env`, instantiate Nango, validate secrets, or verify connections.

## Result type

`ProviderDerivedRuntimeCompositionResult`:

- `runtime: "nango"`
- `status`: `completed` \| `partial` \| `blocked` \| `error`
- `gmailStatus` / `calendarStatus`: `blocked` \| `completed` \| `error`
- `processedMessageCount` / `processedEventCount` (only from safe `completed` providers)
- `signals: ProviderDerivedSignal[]`
- `summary: ProviderDerivedSignalSummary`
- invariant safety flags (`importedRawProviderData: false`, `hasToken: false`, etc.)

**Not included:** Gmail/Calendar metadata, adapter raw results, connection IDs, tokens, provider payloads, message/thread/event/calendar IDs.

## Aggregate status policy

| Gmail | Calendar | Status |
|-------|----------|--------|
| completed | completed | `completed` (signals may be `[]`) |
| completed | blocked/error/unsafe | `partial` |
| blocked/error/unsafe | completed | `partial` |
| blocked | blocked | `blocked` |
| error/unsafe | error/unsafe | `error` |

Warnings use stable categories: `gmail_blocked`, `gmail_runtime_error`, `gmail_unsafe_result`, `calendar_blocked`, `calendar_runtime_error`, `calendar_unsafe_result`.

## Safety validation

Before using signals or counts, each adapter result must pass:

- `isGmailReadOnlyAdapterResultSafe` / `isCalendarReadOnlyAdapterResultSafe` from `@devflow/career-sync`
- Required invariant flags (`safeForClient`, `readOnly`, `hasToken: false`, retention flags `false`, etc.)

Unsafe or rejected providers contribute **zero signals** and **zero counts**.

## Composition reuse

Does **not** duplicate:

- `composeProviderDerivedSignals` — ordering, deduplication, normalization
- `summarizeProviderDerivedSignals` — companies, kinds, interview/pending/offer/rejection flags

Same deterministic ordering as [sandbox composition](./PROVIDER-DERIVED-SANDBOX-COMPOSITION.md): `occurredAt` ↑, calendar before gmail, then `kind`, then `id`.

## What this does not claim

Do **not** state:

- Gmail and Calendar sync active
- Emails and events imported
- CareerBundle enriched automatically
- Background provider sync enabled
- Interviews detected automatically

## Related docs

- [Gmail Read-Only Nango Runtime Adapter](./GMAIL-READONLY-NANGO-RUNTIME-ADAPTER.md)
- [Calendar Read-Only Nango Runtime Adapter](./CALENDAR-READONLY-NANGO-RUNTIME-ADAPTER.md)
- [Provider-Derived Sandbox Composition](./PROVIDER-DERIVED-SANDBOX-COMPOSITION.md)
- [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)
