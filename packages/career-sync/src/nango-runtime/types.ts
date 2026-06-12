import type { ProviderKind, ProviderRuntime } from "../provider-adapter/types.js";
import type { ProviderRuntimeConsentState } from "../provider-runtime/types.js";
import type { ProviderRuntimeFlagMap } from "../provider-runtime-flags/types.js";

export type NangoOAuthBoundaryRequest = {
  provider: ProviderKind;
  runtime: Extract<ProviderRuntime, "nango">;
  flags: ProviderRuntimeFlagMap;
  consent: ProviderRuntimeConsentState;
  requestedAt: string;
  source: "applyflow" | "interview_lab" | "unknown";
  redirectUri?: string;
};

export type NangoOAuthBoundaryStatus = "blocked" | "oauth_start_ready";

export type NangoOAuthBoundaryResult = {
  provider: ProviderKind;
  runtime: "nango";
  source: NangoOAuthBoundaryRequest["source"];
  status: NangoOAuthBoundaryStatus;
  requestedAt: string;
  safeForClient: true;
  canStartOAuth: boolean;
  canCallProvider: false;
  canStoreTokenInClient: false;
  canPersistProviderData: false;
  userReviewRequired: true;
  redirectTo?: string;
  reasons: string[];
  messages: string[];
};

export type NangoOAuthUrlProvider = {
  createAuthorizationUrl(input: {
    provider: ProviderKind;
    redirectUri?: string;
  }): Promise<string>;
};
