import type { ProviderKind, ProviderRuntime } from "../provider-adapter/types.js";
import type {
  ProviderConnectionActionKind,
  ProviderConnectionActionResult,
} from "../provider-connection-action/types.js";
import type { ProviderRuntimeConsentState } from "../provider-runtime/types.js";
import type { ProviderRuntimeFlagMap } from "../provider-runtime-flags/types.js";

export type ProviderRuntimeAppBoundaryMode = "mock" | "disabled" | "future_runtime";

export type ProviderRuntimeAppBoundaryRequest = {
  action: ProviderConnectionActionKind;
  provider: ProviderKind;
  runtime: ProviderRuntime;
  flags: ProviderRuntimeFlagMap;
  consent: ProviderRuntimeConsentState;
  requestedAt: string;
  source: "applyflow" | "interview_lab" | "unknown";
};

export type ProviderRuntimeAppBoundaryResult = {
  action: ProviderConnectionActionKind;
  provider: ProviderKind;
  runtime: ProviderRuntime;
  source: ProviderRuntimeAppBoundaryRequest["source"];
  mode: ProviderRuntimeAppBoundaryMode;
  status: "blocked" | "mocked" | "disabled";
  requestedAt: string;
  safeForClient: true;
  canStartOAuth: false;
  canCallProvider: false;
  canStoreToken: false;
  canPersistProviderData: false;
  userReviewRequired: true;
  actionResult: ProviderConnectionActionResult;
  messages: string[];
};
