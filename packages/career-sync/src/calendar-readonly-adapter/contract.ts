import type {
  CalendarDerivedSignal,
  CalendarReadOnlyAdapterBlockReason,
  CalendarReadOnlyAdapterRequest,
  CalendarReadOnlyAdapterRequestEvaluation,
  CalendarReadOnlyAdapterResult,
  CalendarReadOnlyAdapterStatus,
  CalendarReadOnlyRuntime,
} from "./types.js";

export const CALENDAR_READONLY_DEFAULT_MAX_EVENTS = 25;
export const CALENDAR_READONLY_MAX_SAFE_EVENT_LIMIT = 50;

const SUPPORTED_RUNTIMES: ReadonlySet<CalendarReadOnlyRuntime> = new Set(["nango", "sandbox"]);

const BLOCK_REASON_ORDER: readonly CalendarReadOnlyAdapterBlockReason[] = [
  "runtime_not_supported",
  "connection_not_verified",
  "unsafe_event_limit",
  "invalid_time_window",
];

const FORBIDDEN_CONTENT_SUBSTRINGS = [
  "access_token",
  "refresh_token",
  "client_secret",
  "authorization_code",
  "providerpayload:",
  "rawdescription",
  "rawlocation",
  "hangoutlink",
  "conferenceurl",
  "meet.google.com",
] as const;

const FORBIDDEN_SIGNAL_KEYS = new Set([
  "title",
  "summary",
  "description",
  "location",
  "meetingLink",
  "conferenceUrl",
  "hangoutLink",
  "htmlLink",
  "attendeeEmails",
  "attendeeEmail",
  "organizerEmail",
  "eventId",
  "calendarId",
  "recurrence",
  "attachments",
  "providerPayload",
  "rawDescription",
  "rawLocation",
]);

function sortBlockReasons(
  reasons: CalendarReadOnlyAdapterBlockReason[],
): CalendarReadOnlyAdapterBlockReason[] {
  const seen = new Set<CalendarReadOnlyAdapterBlockReason>();
  const sorted: CalendarReadOnlyAdapterBlockReason[] = [];

  for (const reason of BLOCK_REASON_ORDER) {
    if (reasons.includes(reason) && !seen.has(reason)) {
      seen.add(reason);
      sorted.push(reason);
    }
  }

  return sorted;
}

function isValidIsoDate(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function collectRequestBlockReasons(
  request: CalendarReadOnlyAdapterRequest,
): CalendarReadOnlyAdapterBlockReason[] {
  const reasons: CalendarReadOnlyAdapterBlockReason[] = [];

  if (!SUPPORTED_RUNTIMES.has(request.runtime)) {
    reasons.push("runtime_not_supported");
  }

  if (!request.connectionVerified) {
    reasons.push("connection_not_verified");
  }

  const maxEvents = request.window?.maxEvents ?? CALENDAR_READONLY_DEFAULT_MAX_EVENTS;

  if (
    !Number.isInteger(maxEvents) ||
    maxEvents < 1 ||
    maxEvents > CALENDAR_READONLY_MAX_SAFE_EVENT_LIMIT
  ) {
    reasons.push("unsafe_event_limit");
  }

  const from = request.window?.from;
  const to = request.window?.to;

  if (from != null && !isValidIsoDate(from)) {
    reasons.push("invalid_time_window");
  }

  if (to != null && !isValidIsoDate(to)) {
    reasons.push("invalid_time_window");
  }

  if (from != null && to != null && isValidIsoDate(from) && isValidIsoDate(to)) {
    if (Date.parse(from) > Date.parse(to)) {
      reasons.push("invalid_time_window");
    }
  }

  return sortBlockReasons(reasons);
}

export function createCalendarReadOnlyAdapterRequest(input: {
  runtime: CalendarReadOnlyRuntime;
  connectionVerified: boolean;
  requestedAt: string;
  window?: {
    from?: string;
    to?: string;
    maxEvents?: number;
  };
}): CalendarReadOnlyAdapterRequest {
  return {
    provider: "calendar",
    runtime: input.runtime,
    connectionVerified: input.connectionVerified,
    requestedAt: input.requestedAt,
    window: {
      from: input.window?.from,
      to: input.window?.to,
      maxEvents: input.window?.maxEvents ?? CALENDAR_READONLY_DEFAULT_MAX_EVENTS,
    },
    userReviewRequired: true,
  };
}

export function evaluateCalendarReadOnlyAdapterRequest(
  request: CalendarReadOnlyAdapterRequest,
): CalendarReadOnlyAdapterRequestEvaluation {
  const reasons = collectRequestBlockReasons(request);

  return {
    status: reasons.length > 0 ? "blocked" : "ready",
    request,
    reasons,
  };
}

function defaultMessagesForStatus(status: CalendarReadOnlyAdapterStatus): string[] {
  switch (status) {
    case "blocked":
      return ["Calendar read-only adapter request is blocked by safety gates."];
    case "ready":
      return ["Calendar read-only adapter request passed contract validation."];
    case "completed":
      return [
        "Calendar read-only adapter completed with derived signals only. No raw events were imported or retained.",
      ];
    case "error":
      return ["Calendar read-only adapter failed without importing or retaining raw events."];
    default: {
      const _exhaustive: never = status;
      return [_exhaustive];
    }
  }
}

export function createCalendarReadOnlyAdapterResult(input: {
  runtime: CalendarReadOnlyRuntime;
  status: Exclude<CalendarReadOnlyAdapterStatus, "blocked">;
  connectionVerified: boolean;
  signals?: CalendarDerivedSignal[];
  warnings?: string[];
  messages?: string[];
  processedEventCount?: number;
}): CalendarReadOnlyAdapterResult {
  return {
    provider: "calendar",
    runtime: input.runtime,
    status: input.status,
    safeForClient: true,
    readOnly: true,
    connectionVerified: input.connectionVerified,
    importedRawEvents: false,
    retainedRawPayload: false,
    retainedDescriptions: false,
    retainedLocations: false,
    retainedMeetingLinks: false,
    retainedAttendeeAddresses: false,
    hasToken: false,
    userReviewRequired: true,
    signals: input.signals ?? [],
    warnings: input.warnings ?? [],
    messages: input.messages ?? defaultMessagesForStatus(input.status),
    processedEventCount: input.processedEventCount ?? 0,
  };
}

export function createBlockedCalendarReadOnlyAdapterResult(input: {
  runtime: CalendarReadOnlyRuntime;
  connectionVerified: boolean;
  reasons: CalendarReadOnlyAdapterBlockReason[];
  warnings?: string[];
}): CalendarReadOnlyAdapterResult {
  const reasonWarnings = input.reasons.map((reason) => `blocked:${reason}`);

  return {
    provider: "calendar",
    runtime: input.runtime,
    status: "blocked",
    safeForClient: true,
    readOnly: true,
    connectionVerified: input.connectionVerified,
    importedRawEvents: false,
    retainedRawPayload: false,
    retainedDescriptions: false,
    retainedLocations: false,
    retainedMeetingLinks: false,
    retainedAttendeeAddresses: false,
    hasToken: false,
    userReviewRequired: true,
    signals: [],
    warnings: [...reasonWarnings, ...(input.warnings ?? [])],
    messages: defaultMessagesForStatus("blocked"),
    processedEventCount: 0,
  };
}

function isConfidenceInSafeRange(confidence: number): boolean {
  return Number.isFinite(confidence) && confidence >= 0 && confidence <= 1;
}

function scanResultContent(result: CalendarReadOnlyAdapterResult): string {
  return [
    ...result.messages,
    ...result.warnings,
    ...result.signals.map((signal) => JSON.stringify(signal)),
  ]
    .join(" ")
    .toLowerCase();
}

export function collectCalendarReadOnlyAdapterWarnings(
  result: CalendarReadOnlyAdapterResult,
): string[] {
  const warnings: string[] = [];

  if (result.safeForClient !== true) {
    warnings.push("safeForClient must be true");
  }

  if (result.readOnly !== true) {
    warnings.push("readOnly must be true");
  }

  if (
    result.importedRawEvents !== false ||
    result.retainedRawPayload !== false ||
    result.retainedDescriptions !== false ||
    result.retainedLocations !== false ||
    result.retainedMeetingLinks !== false ||
    result.retainedAttendeeAddresses !== false ||
    result.hasToken !== false
  ) {
    warnings.push("raw import/retention and token flags must remain false");
  }

  if (result.userReviewRequired !== true) {
    warnings.push("userReviewRequired must be true");
  }

  for (const signal of result.signals) {
    if (signal.reviewRequired !== true) {
      warnings.push(`signal ${signal.id} must require user review`);
    }

    if (!isConfidenceInSafeRange(signal.confidence)) {
      warnings.push(`signal ${signal.id} confidence must be between 0 and 1`);
    }

    for (const key of Object.keys(signal)) {
      if (FORBIDDEN_SIGNAL_KEYS.has(key)) {
        warnings.push(`signal ${signal.id} contains forbidden field: ${key}`);
      }
    }
  }

  const contentToScan = scanResultContent(result);
  for (const forbidden of FORBIDDEN_CONTENT_SUBSTRINGS) {
    if (contentToScan.includes(forbidden)) {
      warnings.push(`result content contains forbidden substring: ${forbidden}`);
    }
  }

  return warnings;
}

export function isCalendarReadOnlyAdapterResultSafe(
  result: CalendarReadOnlyAdapterResult,
): boolean {
  return collectCalendarReadOnlyAdapterWarnings(result).length === 0;
}
