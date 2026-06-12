import type { ProviderKind, ProviderRuntime } from "../provider-adapter/types.js";
import type {
  ProviderRuntimeFlagEvaluation,
  ProviderRuntimeFlagMap,
} from "../provider-runtime-flags/types.js";

export type ProviderRuntimeGateStatus = "allowed" | "blocked";

export type ProviderRuntimeBlockReason =
  | "career_provider_runtime_disabled"
  | "nango_runtime_disabled"
  | "gmail_provider_disabled"
  | "calendar_provider_disabled"
  | "unsupported_provider"
  | "unsupported_runtime"
  | "missing_user_consent";

export type ProviderRuntimeConsentState = {
  hasExplicitConsent: boolean;
  consentedAt?: string;
  scopes: string[];
};

export type ProviderRuntimeGateRequest = {
  provider: ProviderKind;
  runtime: ProviderRuntime;
  flags: ProviderRuntimeFlagMap;
  consent: ProviderRuntimeConsentState;
};

export type ProviderRuntimeGateResult = {
  provider: ProviderKind;
  runtime: ProviderRuntime;
  status: ProviderRuntimeGateStatus;
  reasons: ProviderRuntimeBlockReason[];
  flagEvaluation: ProviderRuntimeFlagEvaluation;
  consentRequired: true;
  userReviewRequired: true;
};

export type DisabledProviderRuntimeResult = {
  provider: ProviderKind;
  runtime: ProviderRuntime;
  status: "disabled";
  reasons: ProviderRuntimeBlockReason[];
  canStartOAuth: false;
  canCallProvider: false;
  canStoreToken: false;
  canPersistProviderData: false;
  userReviewRequired: true;
};
