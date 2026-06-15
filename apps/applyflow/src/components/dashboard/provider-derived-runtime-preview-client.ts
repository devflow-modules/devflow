import type {
  ProviderDerivedSignal,
  ProviderDerivedSignalSummary,
} from "@devflow/career-sync";
import {
  PROVIDER_DERIVED_RUNTIME_PREVIEW_DEFAULT_EVENTS,
  PROVIDER_DERIVED_RUNTIME_PREVIEW_DEFAULT_MESSAGES,
} from "./provider-derived-runtime-preview-content";

/**
 * Client-safe provider-derived runtime preview fetch helper.
 * Sends explicit consent and verification flags only — no secrets, tokens, or provider payloads.
 */

export const PROVIDER_DERIVED_RUNTIME_PREVIEW_URL = "/provider-runtime/nango/derived-preview";

export type ProviderDerivedRuntimePreviewClientRequest = {
  explicitConsent: true;
  gmailConnectionVerified: true;
  calendarConnectionVerified: true;
  window?: {
    from?: string;
    to?: string;
  };
  limits: {
    maxMessages: number;
    maxEvents: number;
  };
};

export type ProviderDerivedRuntimePreviewClientResult = {
  runtime: "nango";
  status: "blocked" | "completed" | "partial" | "error";
  safeForClient: true;
  readOnly: true;
  userReviewRequired: true;
  gmailStatus: "blocked" | "completed" | "error";
  calendarStatus: "blocked" | "completed" | "error";
  processedMessageCount: number;
  processedEventCount: number;
  importedRawProviderData: false;
  retainedRawPayload: false;
  retainedBodies: false;
  retainedSnippets: false;
  retainedDescriptions: false;
  retainedLocations: false;
  retainedMeetingLinks: false;
  retainedProviderIdentifiers: false;
  retainedAttendeeAddresses: false;
  hasToken: false;
  signals: ProviderDerivedSignal[];
  summary: ProviderDerivedSignalSummary;
  warnings: string[];
  messages: string[];
};

export type ProviderDerivedRuntimePreviewClientOutcome =
  | { ok: true; result: ProviderDerivedRuntimePreviewClientResult; httpStatus: number }
  | { ok: false; reason: "invalid_response" | "network_error" };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function buildProviderDerivedRuntimePreviewRequest(input: {
  explicitConsentChecked: boolean;
  gmailConnectionVerified: boolean;
  calendarConnectionVerified: boolean;
  window?: {
    from?: string;
    to?: string;
  };
  limits?: {
    maxMessages?: number;
    maxEvents?: number;
  };
}): ProviderDerivedRuntimePreviewClientRequest | null {
  if (
    !input.explicitConsentChecked ||
    !input.gmailConnectionVerified ||
    !input.calendarConnectionVerified
  ) {
    return null;
  }

  return {
    explicitConsent: true,
    gmailConnectionVerified: true,
    calendarConnectionVerified: true,
    window: input.window,
    limits: {
      maxMessages: input.limits?.maxMessages ?? PROVIDER_DERIVED_RUNTIME_PREVIEW_DEFAULT_MESSAGES,
      maxEvents: input.limits?.maxEvents ?? PROVIDER_DERIVED_RUNTIME_PREVIEW_DEFAULT_EVENTS,
    },
  };
}

export function isProviderDerivedRuntimePreviewResponse(
  value: unknown,
): value is ProviderDerivedRuntimePreviewClientResult {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    value.runtime === "nango" &&
    typeof value.status === "string" &&
    value.safeForClient === true &&
    value.readOnly === true &&
    Array.isArray(value.signals) &&
    isPlainObject(value.summary)
  );
}

export async function fetchProviderDerivedRuntimePreview(
  request: ProviderDerivedRuntimePreviewClientRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderDerivedRuntimePreviewClientOutcome> {
  try {
    const response = await fetchImpl(PROVIDER_DERIVED_RUNTIME_PREVIEW_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    const payload: unknown = await response.json();

    if (!isProviderDerivedRuntimePreviewResponse(payload)) {
      return { ok: false, reason: "invalid_response" };
    }

    return { ok: true, result: payload, httpStatus: response.status };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}

export async function runProviderDerivedRuntimePreview(input: {
  explicitConsentChecked: boolean;
  gmailConnectionVerified: boolean;
  calendarConnectionVerified: boolean;
  window?: {
    from?: string;
    to?: string;
  };
  limits?: {
    maxMessages?: number;
    maxEvents?: number;
  };
  fetchImpl?: typeof fetch;
}): Promise<ProviderDerivedRuntimePreviewClientOutcome> {
  const request = buildProviderDerivedRuntimePreviewRequest(input);

  if (!request) {
    return { ok: false, reason: "invalid_response" };
  }

  return fetchProviderDerivedRuntimePreview(request, input.fetchImpl);
}
