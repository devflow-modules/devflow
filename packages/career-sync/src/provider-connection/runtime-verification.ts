/**
 * Client-safe provider connection verification after server-side Nango runtime check.
 * Does not import provider data, run sync jobs, persist payloads, or expose tokens.
 */

import type { ProviderKind } from "../provider-adapter/types.js";

export type ProviderConnectionVerificationState =
  | "not_connected"
  | "connected"
  | "error";

export type ProviderConnectionVerificationRequest = {
  provider: ProviderKind;
  runtime: "nango";
  requestedAt: string;
};

export type ProviderConnectionVerificationResult = {
  provider: ProviderKind;
  runtime: "nango";
  state: ProviderConnectionVerificationState;
  verifiedByServer: true;
  safeForClient: true;
  canSync: false;
  canImportProviderData: false;
  canPersistProviderPayload: false;
  hasToken: false;
  checkedAt: string;
  messages: string[];
  warnings: string[];
};

const DEFAULT_CONNECTED_MESSAGE =
  "Connection verified by the server runtime. No Gmail or Calendar data has been imported.";
const DEFAULT_NOT_CONNECTED_MESSAGE =
  "No provider connection was found by the server runtime.";
const DEFAULT_ERROR_MESSAGE =
  "Server connection verification failed. No provider data was imported or stored.";

function defaultMessagesForState(state: ProviderConnectionVerificationState): string[] {
  switch (state) {
    case "connected":
      return [DEFAULT_CONNECTED_MESSAGE];
    case "not_connected":
      return [DEFAULT_NOT_CONNECTED_MESSAGE];
    case "error":
      return [DEFAULT_ERROR_MESSAGE];
    default: {
      const _exhaustive: never = state;
      return [_exhaustive];
    }
  }
}

export function createProviderConnectionVerificationResult(input: {
  provider: ProviderKind;
  runtime: "nango";
  state: ProviderConnectionVerificationState;
  checkedAt: string;
  messages?: string[];
  warnings?: string[];
}): ProviderConnectionVerificationResult {
  return {
    provider: input.provider,
    runtime: input.runtime,
    state: input.state,
    verifiedByServer: true,
    safeForClient: true,
    canSync: false,
    canImportProviderData: false,
    canPersistProviderPayload: false,
    hasToken: false,
    checkedAt: input.checkedAt,
    messages: input.messages ?? defaultMessagesForState(input.state),
    warnings: input.warnings ?? [],
  };
}

const FORBIDDEN_VERIFICATION_SUBSTRINGS = [
  "access_token",
  "refresh_token",
  "client_secret",
  "authorization_code",
  "providerpayload:",
  "NANGO_SECRET_KEY",
  "raw email body",
  "raw calendar description",
  "hangoutLink",
  "meetingLink",
] as const;

export function isProviderConnectionVerificationResultSafeForClient(
  result: ProviderConnectionVerificationResult,
): boolean {
  if (result.verifiedByServer !== true || result.safeForClient !== true) {
    return false;
  }

  if (
    result.canSync !== false ||
    result.canImportProviderData !== false ||
    result.canPersistProviderPayload !== false ||
    result.hasToken !== false
  ) {
    return false;
  }

  const contentToScan = [...result.messages, ...result.warnings].join(" ").toLowerCase();

  for (const forbidden of FORBIDDEN_VERIFICATION_SUBSTRINGS) {
    if (contentToScan.includes(forbidden.toLowerCase())) {
      return false;
    }
  }

  return true;
}
