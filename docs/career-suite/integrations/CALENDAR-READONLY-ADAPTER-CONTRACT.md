# Calendar Read-Only Adapter Contract

Career Suite defines a privacy-first Calendar read-only adapter contract for future derived career signals.

The contract does not call Calendar, import events, retain descriptions, locations, attendee addresses or meeting links, expose provider tokens, or update applications automatically.

## Status

| Item | State |
|------|--------|
| Contract types and safety policy | **Defined** in `@devflow/career-sync` `calendar-readonly-adapter` |
| Google Calendar API runtime | **Not implemented** |
| Nango proxy for Calendar | **Not implemented** |
| ApplyFlow UI changes | **Out of scope** |
| CareerBundle enrichment from live Calendar | **Not implemented** |

This document is **contract-only**. No OAuth, Nango SDK, `googleapis`, sync jobs, or event fetch exists in this PR.

## Objective

Define pure, client/runtime-safe contracts for a future Calendar read-only adapter:

- minimal request
- ephemeral event metadata input
- derived-signal-only output
- blocked/ready/completed/error results
- explicit safety policy
- data boundaries
- adapter and metadata provider interfaces

## Relationship to existing contracts

| Module | Role |
|--------|------|
| `provider-adapter` | Generic provider adapter boundary (`ProviderNormalizedEvent`) |
| `calendar-sync` | Fixture/sandbox sync preview (`buildCalendarSyncPreview`, `CareerSyncSignal`) |
| `calendar-readonly-adapter` | **Future** live read-only adapter contract with verified-connection gate |
| `gmail-readonly-adapter` | Symmetric Gmail read-only contract |
| `provider-connection/runtime-verification` | Server-side connection verification prerequisite for `nango` runtime |

The new contract complements — does not replace — `CareerSyncSignal`, `CareerBundleUnifiedSyncEnrichment`, or the Nango sandbox adapter.

## Principles

The future Calendar adapter must be:

- read-only
- minimal metadata
- derived-signals-only
- no raw retention
- user-review-required
- connection-verification-required (for real `nango` runtime)
- feature-gated in future runtime PRs

## Preconditions

For real `nango` runtime (future):

1. Explicit user consent
2. Provider runtime feature flags enabled
3. **Server-verified connection** (`connectionVerified: true`)
4. Safe event window (`maxEvents` ≤ 50)

Requests with `connectionVerified: false` are **blocked** at the contract layer.

## Request contract

`CalendarReadOnlyAdapterRequest`:

- `provider: "calendar"`
- `runtime: "nango" | "sandbox"`
- `connectionVerified: boolean`
- `requestedAt: string`
- `window?: { from?, to?, maxEvents }`
- `userReviewRequired: true` (invariant)

The request must not contain tokens, Nango secrets, or provider credentials.

## Ephemeral metadata input

`CalendarEphemeralEventMetadata` allows only minimal metadata:

- `startsAt`, `endsAt`, `timezone`, `status`, `isAllDay`
- `attendeeCount`, `externalAttendeeCount`
- `organizerDomain`, `attendeeDomains` (sanitized domains only)
- `hasConference`, `isRecurring`

**Not included:** title, summary, description, location, meeting URLs, attendee/organizer emails, event/calendar IDs, recurrence payload.

## Derived signal output

`CalendarDerivedSignalKind`:

- `interview_scheduled`
- `interview_rescheduled`
- `interview_cancelled`
- `recruiter_call_likely`
- `follow_up_event_due`
- `application_deadline_detected`

Each signal is derived, reviewable (`reviewRequired: true`), non-authoritative (`confidence` 0–1), and free of titles, descriptions, locations, meeting links, and provider IDs.

## Result contract

`CalendarReadOnlyAdapterResult` invariant flags:

```txt
safeForClient: true
readOnly: true
importedRawEvents: false
retainedRawPayload: false
retainedDescriptions: false
retainedLocations: false
retainedMeetingLinks: false
retainedAttendeeAddresses: false
hasToken: false
userReviewRequired: true
```

Statuses: `blocked` | `ready` | `completed` | `error`

## Safety policy

`CalendarReadOnlySafetyPolicy` explicitly prohibits:

- raw descriptions and locations
- meeting links
- attendee addresses
- attachments and raw provider payload
- token exposure

And requires verified connection (policy level) and user review.

Helpers: `createCalendarReadOnlySafetyPolicy()`, `isCalendarReadOnlySafetyPolicySafe()`, `assertCalendarReadOnlySafetyPolicy()`.

## Adapter interfaces

```ts
export type CalendarReadOnlyAdapter = {
  execute(request: CalendarReadOnlyAdapterRequest): Promise<CalendarReadOnlyAdapterResult>;
};

export type CalendarReadOnlyMetadataProvider = {
  listEventMetadata(input: {
    from?: string;
    to?: string;
    limit: number;
  }): Promise<CalendarEphemeralEventMetadata[]>;
};
```

No implementation ships in this contract PR.

## Block reasons

| Reason | Trigger |
|--------|---------|
| `connection_not_verified` | `connectionVerified !== true` |
| `unsafe_event_limit` | `maxEvents` outside 1–50 |
| `invalid_time_window` | invalid ISO dates or `from > to` |
| `runtime_not_supported` | runtime outside `nango` \| `sandbox` |

## Forbidden data

The contract must not allow retention or output of:

- event description, notes, title/summary
- meeting links, conference data
- attendee/organizer emails (full addresses)
- raw location
- attachments
- provider event/calendar IDs
- recurrence payload
- raw provider payload
- OAuth/Nango credentials

## Public exports

From `@devflow/career-sync`:

- Types: `CalendarReadOnlyAdapterRequest`, `CalendarReadOnlyAdapterResult`, `CalendarDerivedSignal`, …
- Helpers: `createCalendarReadOnlyAdapterRequest`, `evaluateCalendarReadOnlyAdapterRequest`, `createCalendarReadOnlyAdapterResult`, `createBlockedCalendarReadOnlyAdapterResult`, `isCalendarReadOnlyAdapterResultSafe`
- Limits: `CALENDAR_READONLY_DEFAULT_MAX_EVENTS = 25`, `CALENDAR_READONLY_MAX_SAFE_EVENT_LIMIT = 50`

## What this PR does not claim

Do **not** state:

- Calendar integration completed
- Calendar sync active
- events imported
- interviews detected in production

## Related docs

- [Gmail Read-Only Adapter Contract](./GMAIL-READONLY-ADAPTER-CONTRACT.md)
- [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)
- [Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)
- [Provider Consent Architecture](./PROVIDER-CONSENT-ARCHITECTURE.md)
- [Real Provider Runtime Readiness Checklist](./REAL-PROVIDER-RUNTIME-READINESS-CHECKLIST.md)
