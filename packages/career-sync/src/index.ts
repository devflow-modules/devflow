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

export type {
  CareerBundleUnifiedSyncEnrichmentValidationResult,
  ValidateCareerBundleUnifiedSyncEnrichmentOptions,
} from "./unified-sync-enrichment/index.js";

export {
  buildCareerBundleSyncEnrichment,
  buildCareerBundleSyncSummary,
  sortCombinedSignals,
  summarizeCareerBundleSync,
} from "./career-bundle/index.js";

export { validateCareerBundleUnifiedSyncEnrichment } from "./unified-sync-enrichment/index.js";

export type {
  ProviderAdapter,
  ProviderAdapterResult,
  ProviderAdapterSafetyPolicy,
  ProviderConnectionMetadata,
  ProviderConnectionStatus,
  ProviderKind,
  ProviderNormalizedEvent,
  ProviderNormalizedMessage,
  ProviderRuntime,
  ProviderSyncConsent,
  ProviderSyncRequest,
} from "./provider-adapter/index.js";

export {
  assertProviderAdapterResultSafe,
  assertProviderAdapterSafetyPolicy,
  collectProviderAdapterSafetyWarnings,
  createProviderAdapterSafetyPolicy,
  isProviderAdapterSafetyPolicySafe,
} from "./provider-adapter/index.js";

export type {
  NangoSandboxAdapterInput,
  NangoSandboxAdapterOutput,
  NangoSandboxCalendarPayload,
  NangoSandboxGmailPayload,
  NangoSandboxPayload,
  NangoSandboxProvider,
  NangoSandboxRuntime,
} from "./nango-adapter/index.js";

export {
  createNangoSandboxAdapter,
  createNangoSandboxSyncRequest,
  mapNangoSandboxPayloadToProviderNormalized,
} from "./nango-adapter/index.js";

export type {
  ProviderConnectionCapability,
  ProviderConnectionSnapshot,
  ProviderConnectionState,
  ProviderConnectionStatusSummary,
  ProviderSyncAvailability,
} from "./provider-connection/index.js";

export {
  canDeleteProviderDerivedData,
  canProviderSync,
  canRevokeProviderConnection,
  collectProviderConnectionWarnings,
  createProviderConnectionCapability,
  createProviderConnectionSnapshot,
  isProviderConnected,
  summarizeProviderConnections,
  createProviderRuntimeConnectionStatus,
  createProviderRuntimeConnectionStatusFromConnectEvent,
  isProviderRuntimeConnectionStatusSafeForClient,
  mapProviderRuntimeConnectEventToState,
} from "./provider-connection/index.js";

export type {
  ProviderRuntimeConnectEvent,
  ProviderRuntimeConnectionState,
  ProviderRuntimeConnectionStatus,
  ProviderConnectionVerificationRequest,
  ProviderConnectionVerificationResult,
  ProviderConnectionVerificationState,
} from "./provider-connection/index.js";

export {
  createProviderConnectionVerificationResult,
  isProviderConnectionVerificationResultSafeForClient,
} from "./provider-connection/index.js";

export type {
  ProviderRuntimeFlagEvaluation,
  ProviderRuntimeFlagMap,
  ProviderRuntimeFlagName,
} from "./provider-runtime-flags/index.js";

export {
  canUseCalendarProvider,
  canUseGmailProvider,
  canUseNangoRuntime,
  canUseProviderRuntime,
  evaluateProviderRuntimeFlags,
  readProviderRuntimeFlag,
} from "./provider-runtime-flags/index.js";

export type {
  DisabledProviderRuntimeResult,
  ProviderRuntimeBlockReason,
  ProviderRuntimeConsentState,
  ProviderRuntimeGateRequest,
  ProviderRuntimeGateResult,
  ProviderRuntimeGateStatus,
} from "./provider-runtime/index.js";

export {
  createDisabledProviderRuntimeResult,
  createDisabledProviderRuntimeShell,
  evaluateProviderRuntimeGate,
} from "./provider-runtime/index.js";

export type {
  ProviderConnectionActionKind,
  ProviderConnectionActionMode,
  ProviderConnectionActionRequest,
  ProviderConnectionActionResult,
} from "./provider-connection-action/index.js";

export {
  createProviderConnectionActionMock,
  createProviderConnectionActionSnapshot,
} from "./provider-connection-action/index.js";

export type {
  ProviderRuntimeAppBoundaryMode,
  ProviderRuntimeAppBoundaryRequest,
  ProviderRuntimeAppBoundaryResult,
} from "./provider-runtime-app-boundary/index.js";

export {
  createProviderRuntimeAppBoundaryResult,
  isProviderRuntimeAppBoundaryResultSafeForClient,
} from "./provider-runtime-app-boundary/index.js";

export type {
  NangoOAuthBoundaryRequest,
  NangoOAuthBoundaryResult,
  NangoOAuthBoundaryStatus,
  NangoOAuthUrlProvider,
} from "./nango-runtime/index.js";

export {
  createNangoOAuthBoundaryResult,
  evaluateNangoOAuthBoundary,
} from "./nango-runtime/index.js";

export type {
  GmailDerivedSignal,
  GmailDerivedSignalKind,
  GmailEphemeralMessageMetadata,
  GmailReadOnlyAdapter,
  GmailReadOnlyAdapterBlockReason,
  GmailReadOnlyAdapterRequest,
  GmailReadOnlyAdapterRequestEvaluation,
  GmailReadOnlyAdapterResult,
  GmailReadOnlyAdapterStatus,
  GmailReadOnlyMetadataProvider,
  GmailReadOnlyRuntime,
  GmailReadOnlySafetyPolicy,
} from "./gmail-readonly-adapter/index.js";

export {
  GMAIL_READONLY_DEFAULT_MAX_MESSAGES,
  GMAIL_READONLY_MAX_SAFE_MESSAGE_LIMIT,
  assertGmailReadOnlySafetyPolicy,
  collectGmailReadOnlyAdapterWarnings,
  collectGmailReadOnlySafetyPolicyWarnings,
  createBlockedGmailReadOnlyAdapterResult,
  createGmailReadOnlyAdapterRequest,
  createGmailReadOnlyAdapterResult,
  createGmailReadOnlySafetyPolicy,
  evaluateGmailReadOnlyAdapterRequest,
  isGmailReadOnlyAdapterResultSafe,
  isGmailReadOnlySafetyPolicySafe,
} from "./gmail-readonly-adapter/index.js";

export type { GmailSandboxFixture, GmailSandboxFixtureId } from "./gmail-readonly-adapter/index.js";

export {
  GMAIL_SANDBOX_ALL_FIXTURES,
  GMAIL_SANDBOX_FIXTURE_APPLICATION_DETECTED,
  GMAIL_SANDBOX_FIXTURE_FOLLOW_UP_REQUIRED,
  GMAIL_SANDBOX_FIXTURE_INTERVIEW_LIKELY,
  GMAIL_SANDBOX_FIXTURE_MULTI_SIGNAL,
  GMAIL_SANDBOX_FIXTURE_NO_CAREER_SIGNAL,
  GMAIL_SANDBOX_FIXTURE_OFFER_LIKELY,
  GMAIL_SANDBOX_FIXTURE_RECRUITER_RESPONSE,
  GMAIL_SANDBOX_FIXTURE_REJECTION_LIKELY,
  SANDBOX_BASE_TIME,
  createGmailReadOnlySandboxAdapter,
  createGmailSandboxMetadataProvider,
  deriveGmailSignalsFromEphemeralMetadata,
  getGmailSandboxFixture,
} from "./gmail-readonly-adapter/index.js";

export type {
  CalendarDerivedSignal,
  CalendarDerivedSignalKind,
  CalendarEphemeralEventMetadata,
  CalendarReadOnlyAdapter,
  CalendarReadOnlyAdapterBlockReason,
  CalendarReadOnlyAdapterRequest,
  CalendarReadOnlyAdapterRequestEvaluation,
  CalendarReadOnlyAdapterResult,
  CalendarReadOnlyAdapterStatus,
  CalendarReadOnlyMetadataProvider,
  CalendarReadOnlyRuntime,
  CalendarReadOnlySafetyPolicy,
} from "./calendar-readonly-adapter/index.js";

export {
  CALENDAR_READONLY_DEFAULT_MAX_EVENTS,
  CALENDAR_READONLY_MAX_SAFE_EVENT_LIMIT,
  assertCalendarReadOnlySafetyPolicy,
  CALENDAR_SANDBOX_ALL_FIXTURES,
  CALENDAR_SANDBOX_FIXTURE_APPLICATION_DEADLINE,
  CALENDAR_SANDBOX_FIXTURE_FOLLOW_UP_EVENT_DUE,
  CALENDAR_SANDBOX_FIXTURE_INTERVIEW_CANCELLED,
  CALENDAR_SANDBOX_FIXTURE_INTERVIEW_RESCHEDULED,
  CALENDAR_SANDBOX_FIXTURE_INTERVIEW_SCHEDULED,
  CALENDAR_SANDBOX_FIXTURE_MULTI_SIGNAL,
  CALENDAR_SANDBOX_FIXTURE_NO_CAREER_SIGNAL,
  CALENDAR_SANDBOX_FIXTURE_RECRUITER_CALL_LIKELY,
  collectCalendarReadOnlyAdapterWarnings,
  collectCalendarReadOnlySafetyPolicyWarnings,
  createBlockedCalendarReadOnlyAdapterResult,
  createCalendarReadOnlyAdapterRequest,
  createCalendarReadOnlyAdapterResult,
  createCalendarReadOnlySandboxAdapter,
  createCalendarReadOnlySafetyPolicy,
  createCalendarSandboxMetadataProvider,
  createCalendarSandboxScenarioProvider,
  deriveCalendarSignalsFromSandboxEvents,
  evaluateCalendarReadOnlyAdapterRequest,
  getCalendarSandboxFixture,
  isCalendarReadOnlyAdapterResultSafe,
  isCalendarReadOnlySafetyPolicySafe,
} from "./calendar-readonly-adapter/index.js";

export type {
  CalendarSandboxCompanySlug,
  CalendarSandboxFixture,
  CalendarSandboxFixtureEvent,
  CalendarSandboxFixtureId,
  CalendarSandboxScenario,
  CalendarSandboxScenarioProvider,
} from "./calendar-readonly-adapter/index.js";

export type {
  ProviderDerivedSandboxCompositionResult,
  ProviderDerivedSignal,
  ProviderDerivedSignalKind,
  ProviderDerivedSignalSource,
  ProviderDerivedSignalSummary,
  CreateProviderDerivedSignalIdInput,
} from "./provider-derived-signals/index.js";

export {
  composeProviderDerivedSignals,
  sortProviderDerivedSignals,
  createEmptyProviderDerivedSignalSummary,
  createFailedProviderDerivedSandboxCompositionResult,
  createProviderDerivedSandboxCompositionResult,
  createProviderDerivedSignalId,
  createSelectedSignalsComposition,
  executeProviderDerivedSandboxComposition,
  isProviderDerivedSignalId,
  normalizeCalendarDerivedSignal,
  normalizeGmailDerivedSignal,
  normalizeTimestampForProviderDerivedSignalId,
  PROVIDER_DERIVED_SIGNAL_ID_PREFIX,
  summarizeProviderDerivedSignals,
} from "./provider-derived-signals/index.js";

export type {
  ProviderDerivedEnrichmentAdapterInput,
  ProviderDerivedEnrichmentAdapterResult,
} from "./provider-derived-enrichment/index.js";

export {
  adaptProviderDerivedSignalsToSyncEnrichment,
  mapProviderDerivedSignalToCareerSyncSignal,
  mapProviderDerivedSignalsToCareerSyncSignals,
  validateAdaptedCareerBundleSyncEnrichment,
} from "./provider-derived-enrichment/index.js";

export type {
  ProviderDerivedEnrichmentProposalExport,
  ProviderDerivedEnrichmentProposalExportValidationResult,
} from "./provider-derived-enrichment-export/index.js";

export {
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_DOCUMENT_KEYS,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_SCHEMA,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_VERSION,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_FORBIDDEN_KEYS,
  collectForbiddenKeysInDocument,
  hasForbiddenKeysInDocument,
  validateProviderDerivedEnrichmentProposalExport,
  validateProviderDerivedEnrichmentProposalExportV1,
} from "./provider-derived-enrichment-export/index.js";

export type {
  DeriveProviderDerivedCareerInsightsMetricsInput,
  ProviderDerivedCareerInsightsMetrics,
  ProviderDerivedConfidenceBucket,
  ProviderDerivedSignalKindCount,
} from "./provider-derived-insights/index.js";

export { deriveProviderDerivedCareerInsightsMetrics } from "./provider-derived-insights/index.js";
