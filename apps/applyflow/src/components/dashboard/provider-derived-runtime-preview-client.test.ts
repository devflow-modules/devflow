import { describe, expect, it, vi } from "vitest";
import { createEmptyProviderDerivedSignalSummary } from "@devflow/career-sync";
import {
  buildProviderDerivedRuntimePreviewRequest,
  fetchProviderDerivedRuntimePreview,
  isProviderDerivedRuntimePreviewResponse,
  PROVIDER_DERIVED_RUNTIME_PREVIEW_URL,
  runProviderDerivedRuntimePreview,
} from "./provider-derived-runtime-preview-client";

const completedResult = {
  runtime: "nango" as const,
  status: "completed" as const,
  safeForClient: true as const,
  readOnly: true,
  userReviewRequired: true,
  gmailStatus: "completed" as const,
  calendarStatus: "completed" as const,
  processedMessageCount: 1,
  processedEventCount: 2,
  importedRawProviderData: false as const,
  retainedRawPayload: false as const,
  retainedBodies: false as const,
  retainedSnippets: false as const,
  retainedDescriptions: false as const,
  retainedLocations: false as const,
  retainedMeetingLinks: false as const,
  retainedProviderIdentifiers: false as const,
  retainedAttendeeAddresses: false as const,
  hasToken: false as const,
  signals: [],
  summary: createEmptyProviderDerivedSignalSummary(),
  warnings: [],
  messages: ["Read-only provider preview completed. No raw Gmail or Calendar data was retained."],
};

describe("buildProviderDerivedRuntimePreviewRequest", () => {
  it("returns null when prerequisites are missing", () => {
    expect(
      buildProviderDerivedRuntimePreviewRequest({
        explicitConsentChecked: false,
        gmailConnectionVerified: true,
        calendarConnectionVerified: true,
      }),
    ).toBeNull();
  });

  it("builds a safe request with default limits", () => {
    const request = buildProviderDerivedRuntimePreviewRequest({
      explicitConsentChecked: true,
      gmailConnectionVerified: true,
      calendarConnectionVerified: true,
    });

    expect(request).toEqual({
      explicitConsent: true,
      gmailConnectionVerified: true,
      calendarConnectionVerified: true,
      limits: { maxMessages: 10, maxEvents: 10 },
    });
  });
});

describe("fetchProviderDerivedRuntimePreview", () => {
  it("uses POST with explicit consent and safe limits", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => completedResult,
    })) as unknown as typeof fetch;

    const outcome = await fetchProviderDerivedRuntimePreview(
      {
        explicitConsent: true,
        gmailConnectionVerified: true,
        calendarConnectionVerified: true,
        limits: { maxMessages: 10, maxEvents: 10 },
      },
      fetchImpl,
    );

    expect(outcome.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      PROVIDER_DERIVED_RUNTIME_PREVIEW_URL,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          explicitConsent: true,
          gmailConnectionVerified: true,
          calendarConnectionVerified: true,
          limits: { maxMessages: 10, maxEvents: 10 },
        }),
      }),
    );

    const body = JSON.parse(String((fetchImpl.mock.calls[0]?.[1] as RequestInit).body));
    expect(body).not.toHaveProperty("access_token");
    expect(body).not.toHaveProperty("connectionId");
    expect(body).not.toHaveProperty("providerPayload");
  });

  it("handles blocked responses", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 403,
      json: async () => ({
        ...completedResult,
        status: "blocked",
        warnings: ["preview_request_missing_consent"],
      }),
    })) as unknown as typeof fetch;

    const outcome = await fetchProviderDerivedRuntimePreview(
      {
        explicitConsent: true,
        gmailConnectionVerified: true,
        calendarConnectionVerified: true,
        limits: { maxMessages: 10, maxEvents: 10 },
      },
      fetchImpl,
    );

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.result.status).toBe("blocked");
    }
  });

  it("rejects invalid response shape", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ unsafe: true, access_token: "secret" }),
    })) as unknown as typeof fetch;

    const outcome = await fetchProviderDerivedRuntimePreview(
      {
        explicitConsent: true,
        gmailConnectionVerified: true,
        calendarConnectionVerified: true,
        limits: { maxMessages: 10, maxEvents: 10 },
      },
      fetchImpl,
    );

    expect(outcome).toEqual({ ok: false, reason: "invalid_response" });
  });
});

describe("runProviderDerivedRuntimePreview", () => {
  it("does not call fetch when prerequisites are missing", async () => {
    const fetchImpl = vi.fn();
    const outcome = await runProviderDerivedRuntimePreview({
      explicitConsentChecked: false,
      gmailConnectionVerified: true,
      calendarConnectionVerified: true,
      fetchImpl,
    });

    expect(outcome.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("validates response with type guard", () => {
    expect(isProviderDerivedRuntimePreviewResponse(completedResult)).toBe(true);
    expect(isProviderDerivedRuntimePreviewResponse({ status: "completed" })).toBe(false);
  });
});
