# Calendar Read-Only Nango Runtime Adapter

Career Suite includes a server-only Calendar read-only runtime adapter through Nango.

The adapter processes limited Calendar metadata without retaining event titles, descriptions, locations, attendee addresses, meeting links, provider identifiers or OAuth credentials. Derived signals remain review-required, and this runtime is not connected to automatic CareerBundle enrichment.

## Status

| Item | State |
|------|--------|
| Calendar read-only adapter contract | **Defined** in `@devflow/career-sync` |
| Calendar sandbox adapter | **Implemented** |
| Calendar Nango runtime adapter | **Implemented** — ApplyFlow server-only |
| CareerBundle auto-enrichment from runtime | **Not implemented** |
| Background sync | **Not implemented** |

## Official API validation

| Source | Finding |
|--------|---------|
| [Nango Google Calendar integration](https://nango.dev/docs/api-integrations/google-calendar) | Integration ID `google-calendar`; proxy via `nango.get()` |
| [Nango proxy guide](https://nango.dev/docs/guides/platform/proxy/implement-requests-proxy) | Server SDK `get` with `providerConfigKey` + `connectionId` |
| [Calendar `events.list`](https://developers.google.com/calendar/api/v3/reference/events/list) | `calendarId=primary`, `singleEvents`, `orderBy=startTime`, `timeMin`/`timeMax`, `maxResults`, partial `fields` |

### Scope and endpoint used

| Setting | Value |
|---------|--------|
| Nango integration | `google-calendar` |
| List endpoint | `GET /calendar/v3/calendars/primary/events` |
| `maxResults` | 1–50 (`CALENDAR_READONLY_MAX_SAFE_EVENT_LIMIT`) |
| `singleEvents` | `true` |
| `orderBy` | `startTime` |
| `timeMin` / `timeMax` | From request window when provided |
| `fields` | `items(start,end,status,attendees,organizer,conferenceData,recurrence),nextPageToken` |
| Pagination | First page only; stops at requested limit — no unlimited follow |

### Fields deliberately not requested

`summary`, `description`, `location`, `hangoutLink`, `attachments`, `extendedProperties`, full `creator`, event `id`, calendar `id`.

If forbidden fields appear in a response anyway, they are ignored and discarded in memory.

### Fields discarded immediately

Event ID, calendar ID, title/summary, description, location, meeting links, conference URIs/entry points, attendee/organizer emails (only domains kept), recurrence rules, Nango/Calendar raw payload, OAuth tokens.

## Architecture

```txt
executeApplyFlowCalendarReadOnlyRuntimeBoundary
  → flags + consent + connectionVerified + secret
  → createCalendarReadOnlyNangoRuntimeAdapter
    → createCalendarNangoRuntimeMetadataProvider (Nango SDK, server-only)
    → deriveCalendarRuntimeSignalsFromMetadata (conservative, separate from sandbox)
    → CalendarReadOnlyAdapterResult
```

ApplyFlow location: `apps/applyflow/src/lib/provider-runtime/`

| Module | Role |
|--------|------|
| `calendar-readonly-nango-provider.ts` | Nango `listConnections` + Calendar events.list |
| `calendar-runtime-normalization.ts` | Start/end/all-day, domains, status, conference/recurrence booleans |
| `calendar-runtime-classifier.ts` | Conservative runtime signals (empty in v1) |
| `calendar-readonly-nango-adapter.ts` | `CalendarReadOnlyAdapter` for `runtime: "nango"` |
| `calendar-readonly-runtime-boundary.ts` | Feature flags, consent, verification gates |

No HTTP route or UI in this PR — boundary is tested directly.

## Ephemeral metadata produced

`CalendarEphemeralEventMetadata` only:

- `startsAt`, `endsAt`, `timezone?`
- `status` (`confirmed` | `tentative` | `cancelled` | `unknown`)
- `isAllDay`
- `attendeeCount`, `externalAttendeeCount` (always `0` when internal/external cannot be distinguished safely)
- `organizerDomain?`, `attendeeDomains[]` (domains only)
- `hasConference` (boolean — conference payload discarded)
- `isRecurring` (boolean — RRULE payload discarded)

## Runtime classifier

**Separate from sandbox.** Does not use `CalendarSandboxScenario` markers. First runtime release returns `[]` unless future PRs add documented metadata-only rules with unequivocal evidence.

Does **not** infer `interview_scheduled`, `interview_cancelled`, `recruiter_call_likely`, or `application_deadline_detected` from conference flags, attendee counts, or duration alone.

## Gates

All must pass before Nango SDK is called:

1. `CAREER_PROVIDER_RUNTIME_ENABLED`
2. `NANGO_RUNTIME_ENABLED`
3. `CALENDAR_PROVIDER_ENABLED`
4. `NANGO_SECRET_KEY` (server-only)
5. Explicit user consent
6. `connectionVerified: true`
7. Valid `CalendarReadOnlyAdapterRequest` (limits, window)

## Result behaviour

| Case | Outcome |
|------|---------|
| Gate failure | `blocked`, no SDK call |
| Success | `completed`, `processedEventCount` may be > 0, `signals` may be `[]` |
| SDK/Calendar failure | `error`, sanitized message, no raw payload |

Invariant flags: `importedRawEvents: false`, `retainedRawPayload: false`, `retainedDescriptions: false`, `retainedLocations: false`, `retainedMeetingLinks: false`, `retainedAttendeeAddresses: false`, `hasToken: false`, `userReviewRequired: true`.

Completed message: *Calendar metadata was processed through the read-only runtime boundary. No raw event content was retained.*

Error message: *Calendar read-only runtime processing failed safely.*

## What this does not claim

Do **not** state:

- Calendar sync complete
- Events imported
- Interviews detected automatically
- CareerBundle enriched from production Calendar
- Background sync active

## Related docs

- [Calendar Read-Only Adapter Contract](./CALENDAR-READONLY-ADAPTER-CONTRACT.md)
- [Calendar Read-Only Sandbox Adapter](./CALENDAR-READONLY-SANDBOX-ADAPTER.md)
- [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)
- [Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)
