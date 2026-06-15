import type { CalendarEphemeralEventMetadata } from "./types.js";

/**
 * Sandbox-only scenario marker — never part of public runtime payloads.
 */
export type CalendarSandboxScenario =
  | "interview_scheduled"
  | "interview_rescheduled"
  | "interview_cancelled"
  | "recruiter_call_likely"
  | "follow_up_event_due"
  | "application_deadline_detected"
  | "no_signal";

export type CalendarSandboxCompanySlug = "acme" | "beta";

export type CalendarSandboxFixtureEvent = {
  metadata: CalendarEphemeralEventMetadata;
  scenario: CalendarSandboxScenario;
  companySlug?: CalendarSandboxCompanySlug;
};

export type CalendarSandboxFixture = {
  fixtureId: string;
  events: CalendarSandboxFixtureEvent[];
};

export type CalendarSandboxFixtureId =
  | "calendar-interview-scheduled"
  | "calendar-interview-rescheduled"
  | "calendar-interview-cancelled"
  | "calendar-recruiter-call-likely"
  | "calendar-follow-up-event-due"
  | "calendar-application-deadline"
  | "calendar-no-career-signal"
  | "calendar-multi-signal";

export type CalendarSandboxScenarioProvider = {
  listSandboxEvents(input: {
    from?: string;
    to?: string;
    limit: number;
  }): Promise<CalendarSandboxFixtureEvent[]>;
};
