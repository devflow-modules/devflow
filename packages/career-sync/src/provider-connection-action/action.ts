import { createProviderConnectionSnapshot } from "../provider-connection/status.js";
import {
  createDisabledProviderRuntimeShell,
  evaluateProviderRuntimeGate,
} from "../provider-runtime/runtime.js";
import type { ProviderConnectionActionRequest, ProviderConnectionActionResult } from "./types.js";

/**
 * This action is a mock/read-only provider connection action.
 * It never starts OAuth, calls providers, stores tokens, persists data, or changes app state.
 */

export function createProviderConnectionActionSnapshot(
  request: ProviderConnectionActionRequest,
) {
  const base = {
    provider: request.provider,
    runtime: request.runtime,
  };

  switch (request.action) {
    case "connect":
      return createProviderConnectionSnapshot({
        ...base,
        status: "not_connected",
        scopes: request.consent.scopes,
        capability: {
          canSync: false,
          canRevoke: false,
          canDeleteDerivedData: false,
        },
      });
    case "revoke":
      return createProviderConnectionSnapshot({
        ...base,
        status: "revoked",
        revokedAt: request.requestedAt,
        scopes: request.consent.scopes,
        capability: {
          canSync: false,
          canRevoke: false,
          canDeleteDerivedData: true,
        },
      });
    case "delete_derived_data":
      return createProviderConnectionSnapshot({
        ...base,
        status: "not_connected",
        scopes: [],
        capability: {
          canSync: false,
          canRevoke: false,
          canDeleteDerivedData: false,
        },
      });
  }
}

function buildActionMessages(
  request: ProviderConnectionActionRequest,
  gateBlocked: boolean,
): string[] {
  const messages = [
    "Provider connection action is mock/read-only.",
    "Provider runtime is disabled.",
    "No OAuth was started.",
    "No provider call was made.",
    "No token was stored.",
  ];

  if (gateBlocked) {
    messages.push("Runtime gate blocked this action.");
  } else {
    messages.push(
      "Runtime gates allowed evaluation, but real runtime remains disabled in this release.",
    );
  }

  messages.push(`Action: ${request.action}.`);

  return messages;
}

function resolveActionMode(
  request: ProviderConnectionActionRequest,
): ProviderConnectionActionResult["mode"] {
  return request.action === "connect" ? "mock" : "read_only";
}

export function createProviderConnectionActionMock(
  request: ProviderConnectionActionRequest,
): ProviderConnectionActionResult {
  const gate = evaluateProviderRuntimeGate(request);
  const runtimeResult = createDisabledProviderRuntimeShell(request);
  const connectionSnapshot = createProviderConnectionActionSnapshot(request);
  const gateBlocked = gate.status === "blocked";

  return {
    action: request.action,
    provider: request.provider,
    runtime: request.runtime,
    mode: resolveActionMode(request),
    status: gateBlocked ? "blocked" : "mocked",
    requestedAt: request.requestedAt,
    runtimeDisabled: true,
    canStartOAuth: false,
    canCallProvider: false,
    canStoreToken: false,
    canPersistProviderData: false,
    userReviewRequired: true,
    runtimeResult,
    connectionSnapshot,
    messages: buildActionMessages(request, gateBlocked),
  };
}
