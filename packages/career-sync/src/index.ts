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
  sampleTechnicalCalendarEvent,
} from "./fixtures/sample-calendar.js";

export type {
  NangoCalendarEventLike,
  NangoGmailMessageLike,
  NangoProvider,
} from "./nango/types.js";

export {
  mapNangoCalendarEvent,
  mapNangoGmailMessage,
  extractSignalsFromNangoCalendar,
  extractSignalsFromNangoGmail,
} from "./nango/index.js";

export {
  sampleNangoCalendarInterviewEvent,
  sampleNangoInterviewMessage,
  sampleNangoPrivateCalendarEvent,
  sampleNangoRecruiterMessage,
  sampleNangoTechnicalAssignmentMessage,
} from "./fixtures/sample-nango.js";

export type {
  BuildCareerBundleGmailEnrichmentOptions,
  CareerBundleGmailEnrichment,
  CareerBundleSyncEnrichment,
  GmailSyncPreview,
  GmailSyncPreviewInput,
  NangoGmailSyncPreviewInput,
} from "./gmail-sync/types.js";

export {
  buildCareerBundleGmailEnrichment,
  buildGmailSyncPreview,
  buildNangoGmailSyncPreview,
  summarizeGmailSignals,
} from "./gmail-sync/index.js";

export type {
  BuildCalendarSyncPreviewOptions,
  BuildCareerBundleCalendarEnrichmentOptions,
  CalendarSyncPreview,
  CalendarSyncPreviewInput,
  CareerBundleCalendarEnrichment,
  NangoCalendarSyncPreviewInput,
} from "./calendar-sync/types.js";

export {
  buildCalendarSyncPreview,
  buildCareerBundleCalendarEnrichment,
  buildNangoCalendarSyncPreview,
  summarizeCalendarSignals,
} from "./calendar-sync/index.js";

export type {
  BuildCareerBundleSyncEnrichmentOptions,
  CareerBundleSyncEnrichmentInput,
  CareerBundleSyncPrivacy,
  CareerBundleSyncSource,
  CareerBundleSyncSummary,
  CareerBundleUnifiedSyncEnrichment,
} from "./career-bundle/types.js";

export {
  buildCareerBundleSyncEnrichment,
  buildCareerBundleSyncSummary,
  sortCombinedSignals,
  summarizeCareerBundleSync,
} from "./career-bundle/index.js";
