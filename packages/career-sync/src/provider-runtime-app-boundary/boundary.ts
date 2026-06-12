import { createProviderConnectionActionMock } from "../provider-connection-action/action.js";
import type {
  ProviderRuntimeAppBoundaryRequest,
  ProviderRuntimeAppBoundaryResult,
} from "./types.js";

/**
 * This app boundary models the future app-to-runtime contract.
 * It is safe for client consumption and never starts OAuth, calls providers, stores tokens, persists data, or runs sync jobs.
 */

function buildBoundaryMessages(
  request: ProviderRuntimeAppBoundaryRequest,
  actionBlocked: boolean,
): string[] {
  const messages = [
    "Provider runtime app boundary is safe for client consumption.",
    "No OAuth was started.",
    "No provider call was made.",
    "No token was stored.",
    "No provider data was persisted.",
  ];

  if (actionBlocked) {
    messages.push("Runtime gate blocked this app boundary request.");
  } else {
    messages.push(
      "Runtime gates allowed evaluation, but the app boundary remains mock-only in this release.",
    );
  }

  messages.push(`Source: ${request.source}.`);
  messages.push(`Action: ${request.action}.`);

  return messages;
}

function resolveBoundaryMode(
  actionStatus: ProviderRuntimeAppBoundaryResult["status"],
): ProviderRuntimeAppBoundaryResult["mode"] {
  if (actionStatus === "mocked") {
    return "mock";
  }

  return "disabled";
}

export function createProviderRuntimeAppBoundaryResult(
  request: ProviderRuntimeAppBoundaryRequest,
): ProviderRuntimeAppBoundaryResult {
  const actionResult = createProviderConnectionActionMock({
    action: request.action,
    provider: request.provider,
    runtime: request.runtime,
    flags: request.flags,
    consent: request.consent,
    requestedAt: request.requestedAt,
  });

  const status = actionResult.status === "blocked" ? "blocked" : "mocked";

  return {
    action: request.action,
    provider: request.provider,
    runtime: request.runtime,
    source: request.source,
    mode: resolveBoundaryMode(status),
    status,
    requestedAt: request.requestedAt,
    safeForClient: true,
    canStartOAuth: false,
    canCallProvider: false,
    canStoreToken: false,
    canPersistProviderData: false,
    userReviewRequired: true,
    actionResult,
    messages: buildBoundaryMessages(request, actionResult.status === "blocked"),
  };
}

export function isProviderRuntimeAppBoundaryResultSafeForClient(
  result: ProviderRuntimeAppBoundaryResult,
): boolean {
  return (
    result.safeForClient === true &&
    result.canStartOAuth === false &&
    result.canCallProvider === false &&
    result.canStoreToken === false &&
    result.canPersistProviderData === false &&
    result.userReviewRequired === true &&
    result.mode !== "future_runtime"
  );
}
