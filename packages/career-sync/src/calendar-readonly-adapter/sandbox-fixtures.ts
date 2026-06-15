import type { CalendarEphemeralEventMetadata } from "./types.js";
import type {
  CalendarSandboxFixture,
  CalendarSandboxFixtureEvent,
  CalendarSandboxFixtureId,
} from "./sandbox-types.js";

const SANDBOX_BASE_START = "2026-06-20T14:00:00.000Z";
const SANDBOX_BASE_END = "2026-06-20T15:00:00.000Z";

function sandboxEventMetadata(
  input: Omit<CalendarEphemeralEventMetadata, "attendeeDomains"> & {
    attendeeDomains?: string[];
  },
): CalendarEphemeralEventMetadata {
  return {
    ...input,
    attendeeDomains: input.attendeeDomains ?? ["candidate.example"],
  };
}

function fixtureEvent(
  input: CalendarSandboxFixtureEvent,
): CalendarSandboxFixtureEvent {
  return {
    scenario: input.scenario,
    companySlug: input.companySlug,
    metadata: sandboxEventMetadata(input.metadata),
  };
}

export const CALENDAR_SANDBOX_FIXTURE_INTERVIEW_SCHEDULED: CalendarSandboxFixture = {
  fixtureId: "calendar-interview-scheduled",
  events: [
    fixtureEvent({
      scenario: "interview_scheduled",
      companySlug: "acme",
      metadata: {
        startsAt: "2026-06-20T14:00:00.000Z",
        endsAt: "2026-06-20T15:00:00.000Z",
        timezone: "America/Sao_Paulo",
        status: "confirmed",
        isAllDay: false,
        attendeeCount: 3,
        externalAttendeeCount: 2,
        organizerDomain: "acme.example",
        attendeeDomains: ["candidate.example", "jobs.example"],
        hasConference: true,
        isRecurring: false,
      },
    }),
  ],
};

export const CALENDAR_SANDBOX_FIXTURE_INTERVIEW_RESCHEDULED: CalendarSandboxFixture = {
  fixtureId: "calendar-interview-rescheduled",
  events: [
    fixtureEvent({
      scenario: "interview_rescheduled",
      companySlug: "beta",
      metadata: {
        startsAt: "2026-06-21T16:00:00.000Z",
        endsAt: "2026-06-21T16:45:00.000Z",
        timezone: "America/Sao_Paulo",
        status: "tentative",
        isAllDay: false,
        attendeeCount: 2,
        externalAttendeeCount: 1,
        organizerDomain: "beta.example",
        attendeeDomains: ["candidate.example"],
        hasConference: true,
        isRecurring: false,
      },
    }),
  ],
};

export const CALENDAR_SANDBOX_FIXTURE_INTERVIEW_CANCELLED: CalendarSandboxFixture = {
  fixtureId: "calendar-interview-cancelled",
  events: [
    fixtureEvent({
      scenario: "interview_cancelled",
      companySlug: "acme",
      metadata: {
        startsAt: "2026-06-22T10:00:00.000Z",
        endsAt: "2026-06-22T10:30:00.000Z",
        status: "cancelled",
        isAllDay: false,
        attendeeCount: 2,
        externalAttendeeCount: 1,
        organizerDomain: "jobs.example",
        attendeeDomains: ["candidate.example"],
        hasConference: false,
        isRecurring: false,
      },
    }),
  ],
};

export const CALENDAR_SANDBOX_FIXTURE_RECRUITER_CALL_LIKELY: CalendarSandboxFixture = {
  fixtureId: "calendar-recruiter-call-likely",
  events: [
    fixtureEvent({
      scenario: "recruiter_call_likely",
      companySlug: "beta",
      metadata: {
        startsAt: "2026-06-23T11:00:00.000Z",
        endsAt: "2026-06-23T11:30:00.000Z",
        status: "confirmed",
        isAllDay: false,
        attendeeCount: 2,
        externalAttendeeCount: 1,
        organizerDomain: "jobs.example",
        attendeeDomains: ["candidate.example"],
        hasConference: true,
        isRecurring: false,
      },
    }),
  ],
};

export const CALENDAR_SANDBOX_FIXTURE_FOLLOW_UP_EVENT_DUE: CalendarSandboxFixture = {
  fixtureId: "calendar-follow-up-event-due",
  events: [
    fixtureEvent({
      scenario: "follow_up_event_due",
      companySlug: "acme",
      metadata: {
        startsAt: "2026-06-24T09:00:00.000Z",
        endsAt: "2026-06-24T09:15:00.000Z",
        status: "confirmed",
        isAllDay: false,
        attendeeCount: 1,
        externalAttendeeCount: 0,
        organizerDomain: "candidate.example",
        attendeeDomains: ["acme.example"],
        hasConference: false,
        isRecurring: false,
      },
    }),
  ],
};

export const CALENDAR_SANDBOX_FIXTURE_APPLICATION_DEADLINE: CalendarSandboxFixture = {
  fixtureId: "calendar-application-deadline",
  events: [
    fixtureEvent({
      scenario: "application_deadline_detected",
      companySlug: "beta",
      metadata: {
        startsAt: "2026-06-25T00:00:00.000Z",
        endsAt: "2026-06-25T23:59:59.000Z",
        status: "confirmed",
        isAllDay: true,
        attendeeCount: 1,
        externalAttendeeCount: 0,
        organizerDomain: "calendar.example",
        attendeeDomains: ["candidate.example"],
        hasConference: false,
        isRecurring: false,
      },
    }),
  ],
};

export const CALENDAR_SANDBOX_FIXTURE_NO_CAREER_SIGNAL: CalendarSandboxFixture = {
  fixtureId: "calendar-no-career-signal",
  events: [
    fixtureEvent({
      scenario: "no_signal",
      metadata: {
        startsAt: "2026-06-19T08:00:00.000Z",
        endsAt: "2026-06-19T09:00:00.000Z",
        status: "confirmed",
        isAllDay: false,
        attendeeCount: 1,
        externalAttendeeCount: 0,
        organizerDomain: "calendar.example",
        attendeeDomains: ["candidate.example"],
        hasConference: false,
        isRecurring: false,
      },
    }),
  ],
};

export const CALENDAR_SANDBOX_FIXTURE_MULTI_SIGNAL: CalendarSandboxFixture = {
  fixtureId: "calendar-multi-signal",
  events: [
    fixtureEvent({
      scenario: "interview_scheduled",
      companySlug: "acme",
      metadata: {
        startsAt: "2026-06-26T14:00:00.000Z",
        endsAt: "2026-06-26T15:00:00.000Z",
        status: "confirmed",
        isAllDay: false,
        attendeeCount: 3,
        externalAttendeeCount: 2,
        organizerDomain: "acme.example",
        attendeeDomains: ["candidate.example"],
        hasConference: true,
        isRecurring: false,
      },
    }),
    fixtureEvent({
      scenario: "application_deadline_detected",
      companySlug: "beta",
      metadata: {
        startsAt: "2026-06-27T00:00:00.000Z",
        endsAt: "2026-06-27T23:59:59.000Z",
        status: "confirmed",
        isAllDay: true,
        attendeeCount: 1,
        externalAttendeeCount: 0,
        organizerDomain: "calendar.example",
        attendeeDomains: ["candidate.example"],
        hasConference: false,
        isRecurring: false,
      },
    }),
  ],
};

const FIXTURE_BY_ID: Record<CalendarSandboxFixtureId, CalendarSandboxFixture> = {
  "calendar-interview-scheduled": CALENDAR_SANDBOX_FIXTURE_INTERVIEW_SCHEDULED,
  "calendar-interview-rescheduled": CALENDAR_SANDBOX_FIXTURE_INTERVIEW_RESCHEDULED,
  "calendar-interview-cancelled": CALENDAR_SANDBOX_FIXTURE_INTERVIEW_CANCELLED,
  "calendar-recruiter-call-likely": CALENDAR_SANDBOX_FIXTURE_RECRUITER_CALL_LIKELY,
  "calendar-follow-up-event-due": CALENDAR_SANDBOX_FIXTURE_FOLLOW_UP_EVENT_DUE,
  "calendar-application-deadline": CALENDAR_SANDBOX_FIXTURE_APPLICATION_DEADLINE,
  "calendar-no-career-signal": CALENDAR_SANDBOX_FIXTURE_NO_CAREER_SIGNAL,
  "calendar-multi-signal": CALENDAR_SANDBOX_FIXTURE_MULTI_SIGNAL,
};

function cloneFixtureEvent(event: CalendarSandboxFixtureEvent): CalendarSandboxFixtureEvent {
  return {
    scenario: event.scenario,
    companySlug: event.companySlug,
    metadata: {
      ...event.metadata,
      attendeeDomains: [...event.metadata.attendeeDomains],
    },
  };
}

export function getCalendarSandboxFixture(fixtureId: CalendarSandboxFixtureId): CalendarSandboxFixture {
  const fixture = FIXTURE_BY_ID[fixtureId];
  return {
    fixtureId: fixture.fixtureId,
    events: fixture.events.map(cloneFixtureEvent),
  };
}

export const CALENDAR_SANDBOX_ALL_FIXTURES: CalendarSandboxFixture[] = [
  CALENDAR_SANDBOX_FIXTURE_INTERVIEW_SCHEDULED,
  CALENDAR_SANDBOX_FIXTURE_INTERVIEW_RESCHEDULED,
  CALENDAR_SANDBOX_FIXTURE_INTERVIEW_CANCELLED,
  CALENDAR_SANDBOX_FIXTURE_RECRUITER_CALL_LIKELY,
  CALENDAR_SANDBOX_FIXTURE_FOLLOW_UP_EVENT_DUE,
  CALENDAR_SANDBOX_FIXTURE_APPLICATION_DEADLINE,
  CALENDAR_SANDBOX_FIXTURE_NO_CAREER_SIGNAL,
];

export { SANDBOX_BASE_END, SANDBOX_BASE_START };
