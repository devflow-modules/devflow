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
} from "./types.js";

export {
  assertGmailReadOnlySafetyPolicy,
  collectGmailReadOnlySafetyPolicyWarnings,
  createGmailReadOnlySafetyPolicy,
  isGmailReadOnlySafetyPolicySafe,
} from "./safety.js";

export {
  GMAIL_READONLY_DEFAULT_MAX_MESSAGES,
  GMAIL_READONLY_MAX_SAFE_MESSAGE_LIMIT,
  createBlockedGmailReadOnlyAdapterResult,
  createGmailReadOnlyAdapterRequest,
  createGmailReadOnlyAdapterResult,
  evaluateGmailReadOnlyAdapterRequest,
  collectGmailReadOnlyAdapterWarnings,
  isGmailReadOnlyAdapterResultSafe,
} from "./contract.js";

export type { GmailSandboxFixture, GmailSandboxFixtureId } from "./sandbox-types.js";

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
  getGmailSandboxFixture,
} from "./sandbox-fixtures.js";

export {
  buildGmailSandboxSignalId,
  deriveGmailSignalsFromEphemeralMetadata,
} from "./sandbox-classifier.js";

export {
  createGmailReadOnlySandboxAdapter,
  createGmailSandboxMetadataProvider,
} from "./sandbox-adapter.js";
