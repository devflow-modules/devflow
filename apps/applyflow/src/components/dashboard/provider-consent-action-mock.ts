import {
  createProviderConnectionActionMock,
  type ProviderConnectionActionKind,
  type ProviderConnectionActionRequest,
  type ProviderConnectionActionResult,
  type ProviderKind,
} from "@devflow/career-sync";

import { formatProviderConnectionStatusLabel } from "./provider-consent-mock-data";

/**
 * Local fake flags for provider consent action previews.
 * Runtime remains disabled — flags are explicit constants, not environment reads.
 */
export const providerConsentMockFlags = {
  CAREER_PROVIDER_RUNTIME_ENABLED: false,
  NANGO_RUNTIME_ENABLED: false,
  GMAIL_PROVIDER_ENABLED: false,
  CALENDAR_PROVIDER_ENABLED: false,
} as const;

/**
 * Fake consent for previews only — never treated as real user consent.
 */
export const providerConsentMockConsent = {
  hasExplicitConsent: false,
  scopes: [] as string[],
};

const PROVIDER_SCOPE_HINTS: Record<ProviderKind, string[]> = {
  gmail: ["gmail.metadata.read"],
  calendar: ["calendar.events.read"],
};

export const PROVIDER_CONSENT_PREVIEW_REQUESTED_AT = "2026-06-12T10:05:00.000Z";

export function buildProviderConsentActionRequest(
  action: ProviderConnectionActionKind,
  provider: ProviderKind,
  requestedAt: string = PROVIDER_CONSENT_PREVIEW_REQUESTED_AT,
): ProviderConnectionActionRequest {
  return {
    action,
    provider,
    runtime: "nango",
    flags: { ...providerConsentMockFlags },
    consent: {
      ...providerConsentMockConsent,
      scopes: [...PROVIDER_SCOPE_HINTS[provider]],
    },
    requestedAt,
  };
}

export function runProviderConsentActionMock(
  action: ProviderConnectionActionKind,
  provider: ProviderKind,
  requestedAt: string = PROVIDER_CONSENT_PREVIEW_REQUESTED_AT,
): ProviderConnectionActionResult {
  return createProviderConnectionActionMock(
    buildProviderConsentActionRequest(action, provider, requestedAt),
  );
}

export function formatProviderConsentActionStatus(
  status: ProviderConnectionActionResult["status"],
): string {
  return status === "blocked" ? "blocked" : "mocked";
}

export function formatProviderConsentActionReasons(
  result: ProviderConnectionActionResult,
): string {
  if (result.runtimeResult.reasons.length === 0) {
    return "None";
  }

  return result.runtimeResult.reasons.join(", ");
}

export function formatProviderConsentActionSnapshotStatus(
  result: ProviderConnectionActionResult,
): string {
  return formatProviderConnectionStatusLabel(result.connectionSnapshot.status)
    .toLowerCase()
    .replace(/\s+/g, "_");
}
