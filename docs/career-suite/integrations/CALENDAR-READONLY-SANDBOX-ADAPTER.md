# Calendar Read-Only Sandbox Adapter

Career Suite includes a deterministic Calendar read-only sandbox adapter using fake event metadata fixtures.

The sandbox adapter does not call Calendar, import real events, retain descriptions, locations, attendee addresses or meeting links, expose provider tokens, or update applications automatically.

## Status

| Item | State |
|------|--------|
| `CalendarReadOnlyAdapter` contract | **Defined** in `calendar-readonly-adapter/` |
| Sandbox adapter implementation | **Implemented** — `createCalendarReadOnlySandboxAdapter` |
| Google Calendar API runtime | **Implemented** — ApplyFlow server-only metadata via Nango |
| Nango proxy for Calendar | **Implemented** — see [CALENDAR-READONLY-NANGO-RUNTIME-ADAPTER.md](./CALENDAR-READONLY-NANGO-RUNTIME-ADAPTER.md) |

## Objective

Provide a **sandbox-only**, **deterministic**, **fixture-driven** implementation of `CalendarReadOnlyAdapter` that:

1. Validates `CalendarReadOnlyAdapterRequest` via existing contract helpers
2. Reads fake `CalendarEphemeralEventMetadata` from an injectable sandbox scenario provider
3. Derives `CalendarDerivedSignal` using sandbox-only scenario markers (never exposed in public output)
4. Returns a client-safe `CalendarReadOnlyAdapterResult`

## Relationship to legacy `calendar-sync`

| Module | Role |
|--------|------|
| `calendar-sync` | Legacy prototype/preview using fixtures and `CareerSyncSignal` |
| `calendar-readonly-adapter` contract | Formal read-only boundary with verification gates |
| `calendar-readonly-adapter` sandbox | **This PR** — implements `CalendarReadOnlyAdapter` with `CalendarDerivedSignal` |

The sandbox adapter does **not** replace or break `calendar-sync` APIs in this PR.

## Fixtures

Sandbox fixtures are clearly marked demo/fake data:

- `calendar-interview-scheduled`
- `calendar-interview-rescheduled`
- `calendar-interview-cancelled`
- `calendar-recruiter-call-likely`
- `calendar-follow-up-event-due`
- `calendar-application-deadline`
- `calendar-no-career-signal`
- `calendar-multi-signal`

Domains use reserved examples only: `acme.example`, `beta.example`, `jobs.example`, `candidate.example`, `calendar.example`.

Fixtures include only `CalendarEphemeralEventMetadata` fields — no titles, descriptions, locations, meeting links, emails, or provider IDs.

## Sandbox scenarios (internal only)

Classification uses `CalendarSandboxScenario` on fixture events. This marker is **sandbox-only** and never appears in public adapter results.

| Sandbox scenario | Signal kind |
|------------------|-------------|
| `interview_scheduled` | `interview_scheduled` |
| `interview_rescheduled` | `interview_rescheduled` |
| `interview_cancelled` | `interview_cancelled` |
| `recruiter_call_likely` | `recruiter_call_likely` |
| `follow_up_event_due` | `follow_up_event_due` |
| `application_deadline_detected` | `application_deadline_detected` |
| `no_signal` | *(none)* |

Company is derived only from sandbox `companySlug` (`acme` → `Acme`, `beta` → `Beta`). No inference from organizer or attendee domains.

Confidence is fixed per kind (0.75–0.90). All signals require user review.

## Deterministic IDs

Signal IDs follow:

```txt
calendar-sandbox-{kind}-{startsAt-normalized}-{index}
```

Example: `calendar-sandbox-interview_scheduled-2026-06-20T14-00-00-000Z-0`

## Public API

```ts
createCalendarSandboxScenarioProvider(fixture: CalendarSandboxFixture): CalendarSandboxScenarioProvider;

createCalendarSandboxMetadataProvider(fixture: CalendarSandboxFixture): CalendarReadOnlyMetadataProvider;

createCalendarReadOnlySandboxAdapter(input: {
  fixtureProvider: CalendarSandboxScenarioProvider;
}): CalendarReadOnlyAdapter;

deriveCalendarSignalsFromSandboxEvents(events: CalendarSandboxFixtureEvent[]): CalendarDerivedSignal[];
```

`CalendarSandboxScenarioProvider` is an internal sandbox helper. Public metadata consumers use `CalendarReadOnlyMetadataProvider`, which returns sanitized metadata without scenario markers.

## Adapter behaviour

| Case | Result |
|------|--------|
| `runtime !== "sandbox"` | `blocked` (`runtime_not_supported`) |
| Contract validation fails | `blocked` with contract reasons |
| Success | `completed` with derived signals |
| Provider failure | `error` with generic safe message |

Invariant flags remain `importedRawEvents: false`, `retainedDescriptions: false`, `retainedMeetingLinks: false`, `hasToken: false`, etc.

## What this does not claim

Do **not** state:

- Calendar integration active
- Calendar events imported
- Production calendar connected
- Interviews detected in production

## Related docs

- [Calendar Read-Only Adapter Contract](./CALENDAR-READONLY-ADAPTER-CONTRACT.md)
- [Calendar Read-Only Nango Runtime Adapter](./CALENDAR-READONLY-NANGO-RUNTIME-ADAPTER.md)
- [Provider-Derived Sandbox Composition](./PROVIDER-DERIVED-SANDBOX-COMPOSITION.md)
- [Sync Data Boundaries](./SYNC-DATA-BOUNDARIES.md)
- [Nango Gmail/Calendar Plan](./NANGO-GMAIL-CALENDAR-PLAN.md)
