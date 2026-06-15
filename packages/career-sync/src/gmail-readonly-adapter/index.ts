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
