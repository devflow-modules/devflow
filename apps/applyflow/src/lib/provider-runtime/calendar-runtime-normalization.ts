const EMAIL_DOMAIN_PATTERN = /^[^\s@]+@([a-z0-9.-]+\.[a-z]{2,})$/i;
const CALENDAR_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type CalendarDateTimeLike = {
  dateTime?: string;
  date?: string;
  timeZone?: string;
};

function normalizeDomain(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isValidCalendarDateOnly(date: string): boolean {
  const trimmed = date.trim();

  if (!CALENDAR_DATE_ONLY_PATTERN.test(trimmed)) {
    return false;
  }

  const parsed = Date.parse(`${trimmed}T00:00:00.000Z`);

  if (!Number.isFinite(parsed)) {
    return false;
  }

  return new Date(parsed).toISOString().slice(0, 10) === trimmed;
}

function toIsoFromDateOnly(date: string): string | undefined {
  if (!isValidCalendarDateOnly(date)) {
    return undefined;
  }

  return `${date.trim()}T00:00:00.000Z`;
}

function toIsoFromDateTime(dateTime: string): string | undefined {
  const parsed = Date.parse(dateTime.trim());
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return new Date(parsed).toISOString();
}

export function extractCalendarEmailDomain(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  const angleMatch = trimmed.match(/<([^>]+)>/);
  const candidate = angleMatch?.[1] ?? trimmed;
  const domainMatch = candidate.match(EMAIL_DOMAIN_PATTERN);

  if (!domainMatch?.[1]) {
    return undefined;
  }

  return normalizeDomain(domainMatch[1]);
}

export function extractCalendarEmailDomains(values: Array<string | undefined>): string[] {
  const domains = values
    .map((value) => extractCalendarEmailDomain(value))
    .filter((domain): domain is string => domain != null);

  return [...new Set(domains)].sort((left, right) => left.localeCompare(right));
}

export function isCalendarEventTimeWindowValid(startsAt: string, endsAt: string): boolean {
  return endsAt > startsAt;
}

export function normalizeCalendarEventStart(input: unknown): {
  startsAt?: string;
  timezone?: string;
  isAllDay: boolean;
} {
  if (input == null || typeof input !== "object") {
    return { isAllDay: false };
  }

  const value = input as CalendarDateTimeLike;

  if (typeof value.date === "string" && value.date.trim().length > 0) {
    const startsAt = toIsoFromDateOnly(value.date);

    if (!startsAt) {
      return { isAllDay: false };
    }

    return {
      startsAt,
      timezone: value.timeZone?.trim() || undefined,
      isAllDay: true,
    };
  }

  if (typeof value.dateTime === "string" && value.dateTime.trim().length > 0) {
    const startsAt = toIsoFromDateTime(value.dateTime);

    if (!startsAt) {
      return { isAllDay: false };
    }

    return {
      startsAt,
      timezone: value.timeZone?.trim() || undefined,
      isAllDay: false,
    };
  }

  return { isAllDay: false };
}

export function normalizeCalendarEventEnd(
  input: unknown,
  isAllDay: boolean,
): string | undefined {
  if (input == null || typeof input !== "object") {
    return undefined;
  }

  const value = input as CalendarDateTimeLike;

  if (isAllDay && typeof value.date === "string" && value.date.trim().length > 0) {
    return toIsoFromDateOnly(value.date);
  }

  if (typeof value.dateTime === "string" && value.dateTime.trim().length > 0) {
    return toIsoFromDateTime(value.dateTime);
  }

  return undefined;
}

export function normalizeCalendarEventStatus(
  status: string | undefined,
): "confirmed" | "tentative" | "cancelled" | "unknown" {
  switch (status?.toLowerCase()) {
    case "confirmed":
      return "confirmed";
    case "tentative":
      return "tentative";
    case "cancelled":
      return "cancelled";
    default:
      return "unknown";
  }
}

export function detectCalendarHasConference(conferenceData: unknown): boolean {
  if (conferenceData == null || typeof conferenceData !== "object") {
    return false;
  }

  const value = conferenceData as {
    conferenceId?: string;
    entryPoints?: unknown[];
  };

  if (typeof value.conferenceId === "string" && value.conferenceId.trim().length > 0) {
    return true;
  }

  return Array.isArray(value.entryPoints) && value.entryPoints.length > 0;
}

export function detectCalendarIsRecurring(recurrence: unknown): boolean {
  return Array.isArray(recurrence) && recurrence.length > 0;
}
