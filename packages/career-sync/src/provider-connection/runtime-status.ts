/**
 * Client-safe provider runtime connection status after Nango Connect UI events.
 * Does not import provider data, run sync jobs, persist payloads, or expose tokens.
 */

import type { ProviderKind } from "../provider-adapter/types.js";

export type ProviderRuntimeConnectionState =
  | "not_connected"
  | "connecting"
  | "connected"
  | "error"
  | "revoked";

export type ProviderRuntimeConnectEvent =
  | "idle"
  | "connect_start"
  | "connect_success"
  | "connect_close"
  | "connect_error"
  | "revoke";

export type ProviderRuntimeConnectionStatus = {
  provider: ProviderKind;
  runtime: "nango";
  state: ProviderRuntimeConnectionState;
  safeForClient: true;
  canSync: false;
  canImportProviderData: false;
  canPersistProviderPayload: false;
  hasToken: false;
  messages: string[];
  warnings: string[];
  updatedAt: string;
};

const DEFAULT_CONNECTED_MESSAGE =
  "Connection completed. No Gmail or Calendar data has been imported yet.";
const DEFAULT_ERROR_MESSAGE =
  "Connection flow failed locally. No provider data was imported or stored.";
const DEFAULT_NOT_CONNECTED_MESSAGE =
  "Provider is not connected. No Gmail or Calendar data has been imported.";
const DEFAULT_CONNECTING_MESSAGE =
  "Connection flow in progress. No provider data is imported during this step.";
const DEFAULT_REVOKED_MESSAGE =
  "Provider connection was revoked locally. No provider data was imported or stored.";

export function mapProviderRuntimeConnectEventToState(
  event: ProviderRuntimeConnectEvent,
): ProviderRuntimeConnectionState {
  switch (event) {
    case "connect_start":
      return "connecting";
    case "connect_success":
      return "connected";
    case "connect_error":
      return "error";
    case "revoke":
      return "revoked";
    case "idle":
    case "connect_close":
      return "not_connected";
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

function defaultMessagesForState(state: ProviderRuntimeConnectionState): string[] {
  switch (state) {
    case "not_connected":
      return [DEFAULT_NOT_CONNECTED_MESSAGE];
    case "connecting":
      return [DEFAULT_CONNECTING_MESSAGE];
    case "connected":
      return [DEFAULT_CONNECTED_MESSAGE];
    case "error":
      return [DEFAULT_ERROR_MESSAGE];
    case "revoked":
      return [DEFAULT_REVOKED_MESSAGE];
    default: {
      const _exhaustive: never = state;
      return [_exhaustive];
    }
  }
}

export function createProviderRuntimeConnectionStatus(input: {
  provider: ProviderKind;
  runtime: "nango";
  state: ProviderRuntimeConnectionState;
  updatedAt: string;
  messages?: string[];
  warnings?: string[];
}): ProviderRuntimeConnectionStatus {
  return {
    provider: input.provider,
    runtime: input.runtime,
    state: input.state,
    safeForClient: true,
    canSync: false,
    canImportProviderData: false,
    canPersistProviderPayload: false,
    hasToken: false,
    messages: input.messages ?? defaultMessagesForState(input.state),
    warnings: input.warnings ?? [],
    updatedAt: input.updatedAt,
  };
}

export function createProviderRuntimeConnectionStatusFromConnectEvent(input: {
  provider: ProviderKind;
  event: ProviderRuntimeConnectEvent;
  updatedAt: string;
  messages?: string[];
  warnings?: string[];
}): ProviderRuntimeConnectionStatus {
  return createProviderRuntimeConnectionStatus({
    provider: input.provider,
    runtime: "nango",
    state: mapProviderRuntimeConnectEventToState(input.event),
    updatedAt: input.updatedAt,
    messages: input.messages,
    warnings: input.warnings,
  });
}

const FORBIDDEN_STATUS_SUBSTRINGS = [
  "access_token",
  "refresh_token",
  "client_secret",
  "authorization_code",
  "providerPayload",
  "NANGO_SECRET_KEY",
  "raw email body",
  "raw calendar description",
  "hangoutLink",
  "meetingLink",
] as const;

export function isProviderRuntimeConnectionStatusSafeForClient(
  status: ProviderRuntimeConnectionStatus,
): boolean {
  if (status.safeForClient !== true) {
    return false;
  }

  if (
    status.canSync !== false ||
    status.canImportProviderData !== false ||
    status.canPersistProviderPayload !== false ||
    status.hasToken !== false
  ) {
    return false;
  }

  const contentToScan = [...status.messages, ...status.warnings]
    .join(" ")
    .toLowerCase();

  for (const forbidden of FORBIDDEN_STATUS_SUBSTRINGS) {
    if (contentToScan.includes(forbidden.toLowerCase())) {
      return false;
    }
  }

  return true;
}
