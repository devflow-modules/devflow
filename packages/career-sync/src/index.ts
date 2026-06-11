export type {
  CareerSyncSignal,
  ProcessStage,
  RawCalendarEventLike,
  RawGmailMessageLike,
  SyncConfidence,
  SyncSource,
} from "./shared/types.js";

export { extractGmailSignals, normalizeGmailMessage } from "./gmail/extract-gmail-signals.js";
export { extractCalendarSignals, normalizeCalendarEvent } from "./calendar/extract-calendar-signals.js";
export { redactSensitiveText } from "./privacy/redact.js";
export { shouldRetainRawProviderData } from "./privacy/filters.js";

export {
  sampleRecruiterEmail,
  sampleInterviewInviteEmail,
  sampleRejectionEmail,
  sampleTechnicalAssignmentEmail,
} from "./fixtures/sample-gmail.js";

export {
  sampleInterviewCalendarEvent,
  samplePrivateCalendarEvent,
} from "./fixtures/sample-calendar.js";
