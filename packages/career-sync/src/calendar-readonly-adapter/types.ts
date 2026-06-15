/**
 * Calendar read-only adapter contracts — pure types only.
 * Does not call Google Calendar API, Nango proxy, Google client libraries, or retain raw provider payloads.
 */

export type CalendarReadOnlyRuntime = "nango" | "sandbox";

export type CalendarReadOnlyAdapterBlockReason =
  | "connection_not_verified"
  | "invalid_time_window"
  | "unsafe_event_limit"
  | "runtime_not_supported";

export type CalendarReadOnlyAdapterRequest = {
  provider: "calendar";
  runtime: CalendarReadOnlyRuntime;
  connectionVerified: boolean;
  requestedAt: string;
  window?: {
    from?: string;
    to?: string;
    maxEvents: number;
  };
  userReviewRequired: true;
};

/**
 * Ephemeral metadata for future read-only classification.
 * Must not include title, description, location, meeting links, attendee/organizer emails, or provider IDs.
 */
export type CalendarEphemeralEventMetadata = {
  startsAt: string;
  endsAt: string;
  timezone?: string;
  status: "confirmed" | "tentative" | "cancelled" | "unknown";
  isAllDay: boolean;
  attendeeCount: number;
  externalAttendeeCount: number;
  organizerDomain?: string;
  attendeeDomains: string[];
  hasConference: boolean;
  isRecurring: boolean;
};

export type CalendarDerivedSignalKind =
  | "interview_scheduled"
  | "interview_rescheduled"
  | "interview_cancelled"
  | "recruiter_call_likely"
  | "follow_up_event_due"
  | "application_deadline_detected";

export type CalendarDerivedSignal = {
  id: string;
  kind: CalendarDerivedSignalKind;
  provider: "calendar";
  occurredAt: string;
  startsAt?: string;
  company?: string;
  confidence: number;
  reviewRequired: true;
  sourceCount: number;
};

export type CalendarReadOnlyAdapterStatus = "blocked" | "ready" | "completed" | "error";

export type CalendarReadOnlyAdapterResult = {
  provider: "calendar";
  runtime: CalendarReadOnlyRuntime;
  status: CalendarReadOnlyAdapterStatus;
  safeForClient: true;
  readOnly: true;
  connectionVerified: boolean;
  importedRawEvents: false;
  retainedRawPayload: false;
  retainedDescriptions: false;
  retainedLocations: false;
  retainedMeetingLinks: false;
  retainedAttendeeAddresses: false;
  hasToken: false;
  userReviewRequired: true;
  signals: CalendarDerivedSignal[];
  warnings: string[];
  messages: string[];
  processedEventCount: number;
};

export type CalendarReadOnlySafetyPolicy = {
  readOnly: true;
  allowRawDescriptions: false;
  allowRawLocations: false;
  allowMeetingLinks: false;
  allowAttendeeAddresses: false;
  allowAttachments: false;
  allowRawProviderPayload: false;
  allowTokenExposure: false;
  requireVerifiedConnection: true;
  requireUserReview: true;
};

export type CalendarReadOnlyAdapter = {
  execute(request: CalendarReadOnlyAdapterRequest): Promise<CalendarReadOnlyAdapterResult>;
};

/**
 * Future metadata source boundary — must not return raw Calendar API payloads.
 */
export type CalendarReadOnlyMetadataProvider = {
  listEventMetadata(input: {
    from?: string;
    to?: string;
    limit: number;
  }): Promise<CalendarEphemeralEventMetadata[]>;
};

export type CalendarReadOnlyAdapterRequestEvaluation = {
  status: "blocked" | "ready";
  request: CalendarReadOnlyAdapterRequest;
  reasons: CalendarReadOnlyAdapterBlockReason[];
};
