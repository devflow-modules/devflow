/**
 * Client-safe provider connection disconnect result after server-side Nango removal.
 * Does not expose connection IDs, credentials, tokens, or raw Nango payloads.
 */

import type { ProviderKind } from "../provider-adapter/types.js";

export type ProviderConnectionDisconnectStatus = "completed" | "blocked" | "error";

export type ProviderConnectionDisconnectRequest = {
  provider: ProviderKind;
  runtime: "nango";
  explicitConfirmation: true;
  requestedAt: string;
};

export type ProviderConnectionDisconnectResult = {
  provider: ProviderKind;
  runtime: "nango";
  status: ProviderConnectionDisconnectStatus;
  disconnected: boolean;
  previouslyConnected: boolean;
  verifiedByServer: boolean;
  safeForClient: true;
  hasToken: false;
  canSync: false;
  canImportProviderData: false;
  canPersistProviderPayload: false;
  warnings: string[];
  messages: string[];
};

const DEFAULT_COMPLETED_MESSAGE =
  "The provider connection was removed from ApplyFlow. No Gmail or Calendar data was imported or stored.";
const DEFAULT_IDEMPOTENT_MESSAGE =
  "No active provider connection was found. Disconnect is already complete.";
const DEFAULT_BLOCKED_MESSAGE = "Provider disconnect is blocked by runtime policy.";
const DEFAULT_ERROR_MESSAGE =
  "Provider disconnect failed safely. No provider data was imported or stored.";
const GOOGLE_REVOCATION_HINT =
  "To revoke the OAuth grant itself, remove the app under Google Account → Security → Third-party connections.";

function defaultMessagesForStatus(
  status: ProviderConnectionDisconnectStatus,
  input: { disconnected: boolean; previouslyConnected: boolean },
): string[] {
  if (status === "completed" && input.disconnected && !input.previouslyConnected) {
    return [DEFAULT_IDEMPOTENT_MESSAGE];
  }

  if (status === "completed" && input.disconnected) {
    return [DEFAULT_COMPLETED_MESSAGE, GOOGLE_REVOCATION_HINT];
  }

  switch (status) {
    case "blocked":
      return [DEFAULT_BLOCKED_MESSAGE];
    case "error":
      return [DEFAULT_ERROR_MESSAGE];
    case "completed":
      return [DEFAULT_COMPLETED_MESSAGE];
    default: {
      const _exhaustive: never = status;
      return [_exhaustive];
    }
  }
}

export function createProviderConnectionDisconnectResult(input: {
  provider: ProviderKind;
  runtime: "nango";
  status: ProviderConnectionDisconnectStatus;
  disconnected: boolean;
  previouslyConnected: boolean;
  verifiedByServer: boolean;
  messages?: string[];
  warnings?: string[];
}): ProviderConnectionDisconnectResult {
  return {
    provider: input.provider,
    runtime: input.runtime,
    status: input.status,
    disconnected: input.disconnected,
    previouslyConnected: input.previouslyConnected,
    verifiedByServer: input.verifiedByServer,
    safeForClient: true,
    hasToken: false,
    canSync: false,
    canImportProviderData: false,
    canPersistProviderPayload: false,
    messages:
      input.messages ??
      defaultMessagesForStatus(input.status, {
        disconnected: input.disconnected,
        previouslyConnected: input.previouslyConnected,
      }),
    warnings: input.warnings ?? [],
  };
}

const FORBIDDEN_DISCONNECT_SUBSTRINGS = [
  "access_token",
  "refresh_token",
  "client_secret",
  "authorization_code",
  "connectionid",
  "connection_id",
  "nango_secret_key",
  "credentials",
  "authorization: bearer",
] as const;

export function isProviderConnectionDisconnectResultSafeForClient(
  result: ProviderConnectionDisconnectResult,
): boolean {
  if (result.safeForClient !== true) {
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

  for (const forbidden of FORBIDDEN_DISCONNECT_SUBSTRINGS) {
    if (contentToScan.includes(forbidden)) {
      return false;
    }
  }

  const serialized = JSON.stringify(result).toLowerCase();

  for (const forbidden of FORBIDDEN_DISCONNECT_SUBSTRINGS) {
    if (serialized.includes(forbidden)) {
      return false;
    }
  }

  return true;
}
