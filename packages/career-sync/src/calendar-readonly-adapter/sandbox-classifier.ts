import type { CalendarDerivedSignal, CalendarDerivedSignalKind } from "./types.js";
import type {
  CalendarSandboxCompanySlug,
  CalendarSandboxFixtureEvent,
  CalendarSandboxScenario,
} from "./sandbox-types.js";

const SCENARIO_TO_KIND: Readonly<
  Record<Exclude<CalendarSandboxScenario, "no_signal">, CalendarDerivedSignalKind>
> = {
  interview_scheduled: "interview_scheduled",
  interview_rescheduled: "interview_rescheduled",
  interview_cancelled: "interview_cancelled",
  recruiter_call_likely: "recruiter_call_likely",
  follow_up_event_due: "follow_up_event_due",
  application_deadline_detected: "application_deadline_detected",
};

const CONFIDENCE_BY_KIND: Readonly<Record<CalendarDerivedSignalKind, number>> = {
  interview_scheduled: 0.9,
  interview_rescheduled: 0.85,
  interview_cancelled: 0.9,
  recruiter_call_likely: 0.75,
  follow_up_event_due: 0.75,
  application_deadline_detected: 0.85,
};

const COMPANY_BY_SLUG: Readonly<Record<CalendarSandboxCompanySlug, string>> = {
  acme: "Acme",
  beta: "Beta",
};

function normalizeStartsAtForId(startsAt: string): string {
  return startsAt.replace(/[:.]/g, "-");
}

function compareSandboxEvents(
  left: CalendarSandboxFixtureEvent,
  right: CalendarSandboxFixtureEvent,
): number {
  const timeCompare = left.metadata.startsAt.localeCompare(right.metadata.startsAt);
  if (timeCompare !== 0) {
    return timeCompare;
  }

  const leftDomain = left.metadata.organizerDomain ?? "";
  const rightDomain = right.metadata.organizerDomain ?? "";
  return leftDomain.localeCompare(rightDomain);
}

export function buildCalendarSandboxSignalId(input: {
  kind: CalendarDerivedSignalKind;
  startsAt: string;
  index: number;
}): string {
  return `calendar-sandbox-${input.kind}-${normalizeStartsAtForId(input.startsAt)}-${input.index}`;
}

function deriveCompany(companySlug: CalendarSandboxCompanySlug | undefined): string | undefined {
  if (!companySlug) {
    return undefined;
  }

  return COMPANY_BY_SLUG[companySlug];
}

export function deriveCalendarSignalsFromSandboxEvents(
  events: CalendarSandboxFixtureEvent[],
): CalendarDerivedSignal[] {
  const sorted = [...events].sort(compareSandboxEvents);
  const signals: CalendarDerivedSignal[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const event = sorted[index];

    if (event.scenario === "no_signal") {
      continue;
    }

    const kind = SCENARIO_TO_KIND[event.scenario];

    signals.push({
      id: buildCalendarSandboxSignalId({
        kind,
        startsAt: event.metadata.startsAt,
        index,
      }),
      kind,
      provider: "calendar",
      occurredAt: event.metadata.startsAt,
      startsAt: event.metadata.startsAt,
      company: deriveCompany(event.companySlug),
      confidence: CONFIDENCE_BY_KIND[kind],
      reviewRequired: true,
      sourceCount: Math.max(1, event.metadata.attendeeCount),
    });
  }

  return signals.sort((left, right) => {
    const timeCompare = left.occurredAt.localeCompare(right.occurredAt);
    if (timeCompare !== 0) {
      return timeCompare;
    }

    return left.kind.localeCompare(right.kind);
  });
}
