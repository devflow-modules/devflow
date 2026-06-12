import { evaluateProviderRuntimeFlags } from "../provider-runtime-flags/flags.js";
import type {
  DisabledProviderRuntimeResult,
  ProviderRuntimeBlockReason,
  ProviderRuntimeGateRequest,
  ProviderRuntimeGateResult,
} from "./types.js";

/**
 * This module is a disabled runtime shell.
 * It evaluates gates but never starts OAuth, calls providers, stores tokens, persists data, or runs sync jobs.
 */

const BLOCK_REASON_ORDER: readonly ProviderRuntimeBlockReason[] = [
  "career_provider_runtime_disabled",
  "nango_runtime_disabled",
  "gmail_provider_disabled",
  "calendar_provider_disabled",
  "unsupported_provider",
  "unsupported_runtime",
  "missing_user_consent",
];

function sortBlockReasons(reasons: ProviderRuntimeBlockReason[]): ProviderRuntimeBlockReason[] {
  const seen = new Set<ProviderRuntimeBlockReason>();
  const sorted: ProviderRuntimeBlockReason[] = [];

  for (const reason of BLOCK_REASON_ORDER) {
    if (reasons.includes(reason) && !seen.has(reason)) {
      seen.add(reason);
      sorted.push(reason);
    }
  }

  return sorted;
}

export function evaluateProviderRuntimeGate(
  request: ProviderRuntimeGateRequest,
): ProviderRuntimeGateResult {
  const flagEvaluation = evaluateProviderRuntimeFlags(request.flags);
  const reasons: ProviderRuntimeBlockReason[] = [];

  if (!flagEvaluation.careerProviderRuntimeEnabled) {
    reasons.push("career_provider_runtime_disabled");
  }

  if (request.runtime === "nango" && !flagEvaluation.canUseNangoRuntime) {
    reasons.push("nango_runtime_disabled");
  }

  if (request.provider === "gmail" && !flagEvaluation.canUseGmailProvider) {
    reasons.push("gmail_provider_disabled");
  }

  if (request.provider === "calendar" && !flagEvaluation.canUseCalendarProvider) {
    reasons.push("calendar_provider_disabled");
  }

  if (request.runtime === "sandbox" || request.runtime === "manual") {
    reasons.push("unsupported_runtime");
  }

  if (!request.consent.hasExplicitConsent) {
    reasons.push("missing_user_consent");
  }

  const orderedReasons = sortBlockReasons(reasons);
  const status = orderedReasons.length === 0 ? "allowed" : "blocked";

  return {
    provider: request.provider,
    runtime: request.runtime,
    status,
    reasons: orderedReasons,
    flagEvaluation,
    consentRequired: true,
    userReviewRequired: true,
  };
}

/**
 * Real provider runtime will be implemented in a future PR behind feature flags and consent.
 * Even when the gate evaluates to allowed, this PR always returns a disabled shell.
 */
export function createDisabledProviderRuntimeResult(
  gate: ProviderRuntimeGateResult,
): DisabledProviderRuntimeResult {
  return {
    provider: gate.provider,
    runtime: gate.runtime,
    status: "disabled",
    reasons: gate.reasons,
    canStartOAuth: false,
    canCallProvider: false,
    canStoreToken: false,
    canPersistProviderData: false,
    userReviewRequired: true,
  };
}

export function createDisabledProviderRuntimeShell(
  request: ProviderRuntimeGateRequest,
): DisabledProviderRuntimeResult {
  const gate = evaluateProviderRuntimeGate(request);
  return createDisabledProviderRuntimeResult(gate);
}
