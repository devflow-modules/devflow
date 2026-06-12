import type { ProviderKind, ProviderRuntime } from "../provider-adapter/types.js";
import type { ProviderConnectionSnapshot } from "../provider-connection/types.js";
import type { ProviderRuntimeFlagMap } from "../provider-runtime-flags/types.js";
import type {
  DisabledProviderRuntimeResult,
  ProviderRuntimeConsentState,
} from "../provider-runtime/types.js";

export type ProviderConnectionActionKind = "connect" | "revoke" | "delete_derived_data";

export type ProviderConnectionActionMode = "mock" | "read_only";

export type ProviderConnectionActionRequest = {
  action: ProviderConnectionActionKind;
  provider: ProviderKind;
  runtime: ProviderRuntime;
  flags: ProviderRuntimeFlagMap;
  consent: ProviderRuntimeConsentState;
  requestedAt: string;
};

export type ProviderConnectionActionResult = {
  action: ProviderConnectionActionKind;
  provider: ProviderKind;
  runtime: ProviderRuntime;
  mode: ProviderConnectionActionMode;
  status: "blocked" | "mocked";
  requestedAt: string;
  runtimeDisabled: true;
  canStartOAuth: false;
  canCallProvider: false;
  canStoreToken: false;
  canPersistProviderData: false;
  userReviewRequired: true;
  runtimeResult: DisabledProviderRuntimeResult;
  connectionSnapshot: ProviderConnectionSnapshot;
  messages: string[];
};
