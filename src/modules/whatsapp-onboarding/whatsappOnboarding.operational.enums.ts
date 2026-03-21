/** Estágio inferido para health / operação (enum fechado). */
export const OnboardingCurrentStage = {
  NOT_STARTED: "NOT_STARTED",
  CODE_REQUESTED: "CODE_REQUESTED",
  CODE_VERIFIED: "CODE_VERIFIED",
  REGISTERED: "REGISTERED",
  READY: "READY",
  BLOCKED: "BLOCKED",
  ERROR: "ERROR",
} as const;
export type OnboardingCurrentStage =
  (typeof OnboardingCurrentStage)[keyof typeof OnboardingCurrentStage];

export const BlockedReason = {
  NONE: "NONE",
  META_TOKEN_INVALID: "META_TOKEN_INVALID",
  META_PERMISSION_DENIED: "META_PERMISSION_DENIED",
  WABA_NOT_ACCESSIBLE: "WABA_NOT_ACCESSIBLE",
  PHONE_NUMBER_NOT_FOUND: "PHONE_NUMBER_NOT_FOUND",
  DISPLAY_NAME_REVIEW_PENDING: "DISPLAY_NAME_REVIEW_PENDING",
  DISPLAY_NAME_REJECTED: "DISPLAY_NAME_REJECTED",
  BUSINESS_VERIFICATION_REQUIRED: "BUSINESS_VERIFICATION_REQUIRED",
  VERIFICATION_CODE_NOT_REQUESTED: "VERIFICATION_CODE_NOT_REQUESTED",
  REGISTER_ALREADY_COMPLETED: "REGISTER_ALREADY_COMPLETED",
  META_API_ERROR: "META_API_ERROR",
  MISSING_ENV: "MISSING_ENV",
  UNKNOWN: "UNKNOWN",
} as const;
export type BlockedReason = (typeof BlockedReason)[keyof typeof BlockedReason];

export const LastOperation = {
  NONE: "NONE",
  REQUEST_CODE: "REQUEST_CODE",
  VERIFY_CODE: "VERIFY_CODE",
  REGISTER: "REGISTER",
  STATUS_SYNC: "STATUS_SYNC",
  HEALTH_SYNC: "HEALTH_SYNC",
} as const;
export type LastOperation = (typeof LastOperation)[keyof typeof LastOperation];

export const LastOperationStatus = {
  UNKNOWN: "UNKNOWN",
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE",
  SKIPPED_IDEMPOTENT: "SKIPPED_IDEMPOTENT",
} as const;
export type LastOperationStatus =
  (typeof LastOperationStatus)[keyof typeof LastOperationStatus];
