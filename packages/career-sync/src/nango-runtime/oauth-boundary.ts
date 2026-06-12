import { evaluateProviderRuntimeFlags } from "../provider-runtime-flags/flags.js";
import type {
  NangoOAuthBoundaryRequest,
  NangoOAuthBoundaryResult,
  NangoOAuthUrlProvider,
} from "./types.js";

/**
 * This OAuth boundary models the first real Nango OAuth gate.
 * It is safe for client consumption and never calls Gmail/Calendar APIs, stores tokens in the client,
 * persists provider data, or runs sync jobs.
 *
 * Server adapters should implement `NangoOAuthUrlProvider` using Nango's current connect-session flow
 * (`@nangohq/node` `createConnectSession`) without exposing secrets or tokens to apps.
 */

const REASON_ORDER = [
  "career_provider_runtime_disabled",
  "nango_runtime_disabled",
  "gmail_provider_disabled",
  "calendar_provider_disabled",
  "missing_user_consent",
] as const;

function sortReasons(reasons: string[]): string[] {
  const seen = new Set<string>();
  const sorted: string[] = [];

  for (const reason of REASON_ORDER) {
    if (reasons.includes(reason) && !seen.has(reason)) {
      seen.add(reason);
      sorted.push(reason);
    }
  }

  return sorted;
}

function collectOAuthBlockReasons(request: NangoOAuthBoundaryRequest): string[] {
  const flagEvaluation = evaluateProviderRuntimeFlags(request.flags);
  const reasons: string[] = [];

  if (!flagEvaluation.careerProviderRuntimeEnabled) {
    reasons.push("career_provider_runtime_disabled");
  }

  if (!flagEvaluation.canUseNangoRuntime) {
    reasons.push("nango_runtime_disabled");
  }

  if (request.provider === "gmail" && !flagEvaluation.canUseGmailProvider) {
    reasons.push("gmail_provider_disabled");
  }

  if (request.provider === "calendar" && !flagEvaluation.canUseCalendarProvider) {
    reasons.push("calendar_provider_disabled");
  }

  if (!request.consent.hasExplicitConsent) {
    reasons.push("missing_user_consent");
  }

  return sortReasons(reasons);
}

function buildBoundaryMessages(
  request: NangoOAuthBoundaryRequest,
  status: NangoOAuthBoundaryResult["status"],
): string[] {
  const messages = [
    "Nango OAuth boundary is safe for client consumption.",
    "No Gmail or Calendar data import occurs in this boundary.",
    "No provider sync jobs are started.",
    "No token is stored in the client.",
    "No provider data is persisted.",
  ];

  if (status === "blocked") {
    messages.push("OAuth start is blocked by runtime flags or consent.");
  } else {
    messages.push("OAuth start is ready behind explicit flags and consent.");
    messages.push("Provider API calls remain disabled in this release.");
  }

  messages.push(`Source: ${request.source}.`);
  messages.push(`Provider: ${request.provider}.`);

  return messages;
}

function createBaseBoundaryResult(
  request: NangoOAuthBoundaryRequest,
  status: NangoOAuthBoundaryResult["status"],
  reasons: string[],
): NangoOAuthBoundaryResult {
  return {
    provider: request.provider,
    runtime: "nango",
    source: request.source,
    status,
    requestedAt: request.requestedAt,
    safeForClient: true,
    canStartOAuth: status === "oauth_start_ready",
    canCallProvider: false,
    canStoreTokenInClient: false,
    canPersistProviderData: false,
    userReviewRequired: true,
    reasons,
    messages: buildBoundaryMessages(request, status),
  };
}

export function evaluateNangoOAuthBoundary(
  request: NangoOAuthBoundaryRequest,
): NangoOAuthBoundaryResult {
  const reasons = collectOAuthBlockReasons(request);
  const status = reasons.length === 0 ? "oauth_start_ready" : "blocked";

  return createBaseBoundaryResult(request, status, reasons);
}

export async function createNangoOAuthBoundaryResult(
  request: NangoOAuthBoundaryRequest,
  oauthUrlProvider: NangoOAuthUrlProvider,
): Promise<NangoOAuthBoundaryResult> {
  const evaluation = evaluateNangoOAuthBoundary(request);

  if (evaluation.status === "blocked") {
    return evaluation;
  }

  const redirectTo = await oauthUrlProvider.createAuthorizationUrl({
    provider: request.provider,
    redirectUri: request.redirectUri,
  });

  return {
    ...evaluation,
    redirectTo,
    messages: [
      ...evaluation.messages,
      "OAuth authorization redirect URL is ready for server-mediated flow.",
      "No access token, refresh token, authorization code, or secret is included in this result.",
    ],
  };
}
