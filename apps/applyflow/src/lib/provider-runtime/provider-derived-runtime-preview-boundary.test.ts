import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createBlockedCalendarReadOnlyAdapterResult,
  createBlockedGmailReadOnlyAdapterResult,
  createCalendarReadOnlyAdapterResult,
  createEmptyProviderDerivedSignalSummary,
  createGmailReadOnlyAdapterResult,
  createProviderConnectionVerificationResult,
} from "@devflow/career-sync";
import { executeCalendarReadOnlyNangoRuntime } from "./calendar-readonly-nango-adapter.js";
import { executeGmailReadOnlyNangoRuntime } from "./gmail-readonly-nango-adapter.js";
import {
  createBlockedProviderDerivedRuntimePreviewResult,
  handleProviderDerivedRuntimePreview,
  parseProviderDerivedRuntimePreviewRequest,
  resolveProviderDerivedRuntimePreviewHttpStatus,
} from "./provider-derived-runtime-preview-boundary.js";
import type { ProviderDerivedRuntimeCompositionResult } from "./provider-derived-runtime-composition.js";

vi.mock("./gmail-readonly-nango-adapter.js", () => ({
  executeGmailReadOnlyNangoRuntime: vi.fn(),
}));

vi.mock("./calendar-readonly-nango-adapter.js", () => ({
  executeCalendarReadOnlyNangoRuntime: vi.fn(),
}));

const allFlagsOnEnv = {
  CAREER_PROVIDER_RUNTIME_ENABLED: "true",
  NANGO_RUNTIME_ENABLED: "true",
  GMAIL_PROVIDER_ENABLED: "true",
  CALENDAR_PROVIDER_ENABLED: "true",
  NANGO_SECRET_KEY: "nango-secret-test",
};

const requestedAt = "2026-06-15T12:00:00.000Z";

const validRequestBody = {
  explicitConsent: true,
  limits: { maxMessages: 10, maxEvents: 10 },
};

const bypassRequestBody = {
  explicitConsent: true,
  gmailConnectionVerified: true,
  calendarConnectionVerified: true,
  limits: { maxMessages: 10, maxEvents: 10 },
};

function connectedVerification(provider: "gmail" | "calendar") {
  return createProviderConnectionVerificationResult({
    provider,
    runtime: "nango",
    state: "connected",
    checkedAt: requestedAt,
  });
}

function notConnectedVerification(provider: "gmail" | "calendar") {
  return createProviderConnectionVerificationResult({
    provider,
    runtime: "nango",
    state: "not_connected",
    checkedAt: requestedAt,
  });
}

function errorVerification(provider: "gmail" | "calendar") {
  return createProviderConnectionVerificationResult({
    provider,
    runtime: "nango",
    state: "error",
    checkedAt: requestedAt,
  });
}

function completedCompositionResult(): ProviderDerivedRuntimeCompositionResult {
  return {
    runtime: "nango",
    status: "completed",
    safeForClient: true,
    readOnly: true,
    userReviewRequired: true,
    gmailStatus: "completed",
    calendarStatus: "completed",
    processedMessageCount: 2,
    processedEventCount: 3,
    importedRawProviderData: false,
    retainedRawPayload: false,
    retainedBodies: false,
    retainedSnippets: false,
    retainedDescriptions: false,
    retainedLocations: false,
    retainedMeetingLinks: false,
    retainedProviderIdentifiers: false,
    retainedAttendeeAddresses: false,
    hasToken: false,
    signals: [],
    summary: createEmptyProviderDerivedSignalSummary(),
    warnings: [],
    messages: ["composed"],
  };
}

describe("parseProviderDerivedRuntimePreviewRequest", () => {
  it("accepts a valid preview request without client connection fields", () => {
    const parsed = parseProviderDerivedRuntimePreviewRequest(validRequestBody);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.request.limits.maxMessages).toBe(10);
      expect(parsed.request.limits.maxEvents).toBe(10);
      expect(parsed.request).not.toHaveProperty("gmailConnectionVerified");
      expect(parsed.request).not.toHaveProperty("calendarConnectionVerified");
    }
  });

  it("ignores client connection booleans and still accepts structurally valid request", () => {
    const parsed = parseProviderDerivedRuntimePreviewRequest(bypassRequestBody);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.request.explicitConsent).toBe(true);
      expect(parsed.request).not.toHaveProperty("gmailConnectionVerified");
    }
  });

  it("rejects non-integer and out-of-range limits", () => {
    expect(
      parseProviderDerivedRuntimePreviewRequest({
        ...validRequestBody,
        limits: { maxMessages: Number.NaN, maxEvents: 10 },
      }).ok,
    ).toBe(false);
    expect(
      parseProviderDerivedRuntimePreviewRequest({
        ...validRequestBody,
        limits: { maxMessages: Number.POSITIVE_INFINITY, maxEvents: 10 },
      }).ok,
    ).toBe(false);
    expect(
      parseProviderDerivedRuntimePreviewRequest({
        ...validRequestBody,
        limits: { maxMessages: 10.5, maxEvents: 10 },
      }).ok,
    ).toBe(false);
  });

  it("rejects missing consent", () => {
    const parsed = parseProviderDerivedRuntimePreviewRequest({
      ...validRequestBody,
      explicitConsent: false,
    });

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toBe("missing_consent");
      expect(parsed.httpStatus).toBe(403);
    }
  });

  it("rejects invalid limits", () => {
    expect(
      parseProviderDerivedRuntimePreviewRequest({
        ...validRequestBody,
        limits: { maxMessages: 0, maxEvents: 10 },
      }).ok,
    ).toBe(false);
    expect(
      parseProviderDerivedRuntimePreviewRequest({
        ...validRequestBody,
        limits: { maxMessages: 51, maxEvents: 10 },
      }).ok,
    ).toBe(false);
    expect(
      parseProviderDerivedRuntimePreviewRequest({
        ...validRequestBody,
        limits: { maxMessages: 10, maxEvents: 0 },
      }).ok,
    ).toBe(false);
  });

  it("rejects invalid window", () => {
    const parsed = parseProviderDerivedRuntimePreviewRequest({
      ...validRequestBody,
      window: {
        from: "2026-06-30T00:00:00.000Z",
        to: "2026-06-01T00:00:00.000Z",
      },
    });

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toBe("invalid_window");
      expect(parsed.httpStatus).toBe(400);
    }
  });
});

describe("handleProviderDerivedRuntimePreview", () => {
  const verifyGmailConnection = vi.fn(async () => connectedVerification("gmail"));
  const verifyCalendarConnection = vi.fn(async () => connectedVerification("calendar"));
  const executeComposition = vi.fn(async (input: {
    executeGmail: () => Promise<unknown>;
    executeCalendar: () => Promise<unknown>;
  }) => {
    await input.executeGmail();
    await input.executeCalendar();
    return completedCompositionResult();
  });

  beforeEach(() => {
    vi.mocked(executeGmailReadOnlyNangoRuntime).mockReset();
    vi.mocked(executeCalendarReadOnlyNangoRuntime).mockReset();
    verifyGmailConnection.mockReset();
    verifyCalendarConnection.mockReset();
    executeComposition.mockReset();

    verifyGmailConnection.mockResolvedValue(connectedVerification("gmail"));
    verifyCalendarConnection.mockResolvedValue(connectedVerification("calendar"));
    executeComposition.mockImplementation(async (input: {
      executeGmail: () => Promise<unknown>;
      executeCalendar: () => Promise<unknown>;
    }) => {
      await input.executeGmail();
      await input.executeCalendar();
      return completedCompositionResult();
    });

    vi.mocked(executeGmailReadOnlyNangoRuntime).mockResolvedValue({
      result: createGmailReadOnlyAdapterResult({
        runtime: "nango",
        status: "completed",
        connectionVerified: true,
        processedMessageCount: 2,
      }),
      metadata: [],
    });
    vi.mocked(executeCalendarReadOnlyNangoRuntime).mockResolvedValue({
      result: createCalendarReadOnlyAdapterResult({
        runtime: "nango",
        status: "completed",
        connectionVerified: true,
        processedEventCount: 3,
      }),
      metadata: [],
    });
  });

  it("blocks bypass payload when Gmail is not connected server-side", async () => {
    verifyGmailConnection.mockResolvedValueOnce(notConnectedVerification("gmail"));

    const parsed = parseProviderDerivedRuntimePreviewRequest(bypassRequestBody);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const result = await handleProviderDerivedRuntimePreview(parsed.request, {
      env: allFlagsOnEnv,
      requestedAt,
      verifyGmailConnection,
      verifyCalendarConnection,
      executeComposition,
    });

    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("gmail_connection_not_verified");
    expect(result.processedMessageCount).toBe(0);
    expect(result.processedEventCount).toBe(0);
    expect(executeComposition).not.toHaveBeenCalled();
    expect(executeGmailReadOnlyNangoRuntime).not.toHaveBeenCalled();
    expect(executeCalendarReadOnlyNangoRuntime).not.toHaveBeenCalled();
  });

  it("blocks bypass payload when Calendar is not connected server-side", async () => {
    verifyCalendarConnection.mockResolvedValueOnce(notConnectedVerification("calendar"));

    const parsed = parseProviderDerivedRuntimePreviewRequest(bypassRequestBody);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const result = await handleProviderDerivedRuntimePreview(parsed.request, {
      env: allFlagsOnEnv,
      requestedAt,
      verifyGmailConnection,
      verifyCalendarConnection,
      executeComposition,
    });

    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("calendar_connection_not_verified");
    expect(executeComposition).not.toHaveBeenCalled();
  });

  it("blocks full attacker bypass payload without reflecting extra fields", async () => {
    verifyGmailConnection.mockResolvedValueOnce(notConnectedVerification("gmail"));
    verifyCalendarConnection.mockResolvedValueOnce(notConnectedVerification("calendar"));

    const parsed = parseProviderDerivedRuntimePreviewRequest({
      explicitConsent: true,
      gmailConnectionVerified: true,
      calendarConnectionVerified: true,
      connectionId: "attacker-controlled",
      access_token: "fake-token",
      end_user_id: "attacker-user",
      limits: { maxMessages: 10, maxEvents: 10 },
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const result = await handleProviderDerivedRuntimePreview(parsed.request, {
      env: allFlagsOnEnv,
      requestedAt,
      verifyGmailConnection,
      verifyCalendarConnection,
      executeComposition,
    });

    const serialized = JSON.stringify(result);
    expect(result.status).toBe("blocked");
    expect(result.signals).toEqual([]);
    expect(result.processedMessageCount).toBe(0);
    expect(result.processedEventCount).toBe(0);
    expect(executeComposition).not.toHaveBeenCalled();
    expect(serialized).not.toMatch(
      /attacker-controlled|fake-token|attacker-user|connectionId|access_token|end_user_id/i,
    );
  });

  it("blocks when both verifications fail without calling runtimes", async () => {
    verifyGmailConnection.mockResolvedValueOnce(errorVerification("gmail"));
    verifyCalendarConnection.mockResolvedValueOnce(errorVerification("calendar"));

    const parsed = parseProviderDerivedRuntimePreviewRequest(validRequestBody);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const result = await handleProviderDerivedRuntimePreview(parsed.request, {
      env: allFlagsOnEnv,
      requestedAt,
      verifyGmailConnection,
      verifyCalendarConnection,
      executeComposition,
    });

    expect(result.status).toBe("blocked");
    expect(result.warnings).toEqual([
      "gmail_connection_verification_error",
      "calendar_connection_verification_error",
    ]);
    expect(executeComposition).not.toHaveBeenCalled();
  });

  it("verifies Gmail and Calendar on the server before runtimes", async () => {
    const parsed = parseProviderDerivedRuntimePreviewRequest(validRequestBody);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    await handleProviderDerivedRuntimePreview(parsed.request, {
      env: allFlagsOnEnv,
      requestedAt,
      verifyGmailConnection,
      verifyCalendarConnection,
      executeComposition,
    });

    expect(verifyGmailConnection).toHaveBeenCalledOnce();
    expect(verifyCalendarConnection).toHaveBeenCalledOnce();
    expect(executeComposition).toHaveBeenCalledOnce();
    expect(executeGmailReadOnlyNangoRuntime).toHaveBeenCalledOnce();
    expect(executeCalendarReadOnlyNangoRuntime).toHaveBeenCalledOnce();
  });

  it("does not call runtimes when Gmail verification errors", async () => {
    verifyGmailConnection.mockResolvedValueOnce(errorVerification("gmail"));

    const parsed = parseProviderDerivedRuntimePreviewRequest(validRequestBody);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const result = await handleProviderDerivedRuntimePreview(parsed.request, {
      env: allFlagsOnEnv,
      requestedAt,
      verifyGmailConnection,
      verifyCalendarConnection,
      executeComposition,
    });

    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("gmail_connection_verification_error");
    expect(executeComposition).not.toHaveBeenCalled();
  });

  it("does not call runtimes when Calendar verification errors", async () => {
    verifyCalendarConnection.mockResolvedValueOnce(errorVerification("calendar"));

    const parsed = parseProviderDerivedRuntimePreviewRequest(validRequestBody);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const result = await handleProviderDerivedRuntimePreview(parsed.request, {
      env: allFlagsOnEnv,
      requestedAt,
      verifyGmailConnection,
      verifyCalendarConnection,
      executeComposition,
    });

    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("calendar_connection_verification_error");
    expect(executeComposition).not.toHaveBeenCalled();
  });

  it("passes window and limits to runtime boundaries after verification", async () => {
    const parsed = parseProviderDerivedRuntimePreviewRequest({
      ...validRequestBody,
      window: {
        from: "2026-06-01T00:00:00.000Z",
        to: "2026-06-30T00:00:00.000Z",
      },
      limits: { maxMessages: 5, maxEvents: 7 },
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    await handleProviderDerivedRuntimePreview(parsed.request, {
      env: allFlagsOnEnv,
      requestedAt,
      verifyGmailConnection,
      verifyCalendarConnection,
      executeComposition,
    });

    expect(executeGmailReadOnlyNangoRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          window: expect.objectContaining({ maxMessages: 5 }),
        }),
      }),
    );
    expect(executeCalendarReadOnlyNangoRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          window: expect.objectContaining({ maxEvents: 7 }),
        }),
      }),
    );
  });

  it("returns partial composition when one provider fails at runtime", async () => {
    executeComposition.mockResolvedValueOnce({
      ...completedCompositionResult(),
      status: "partial",
      gmailStatus: "completed",
      calendarStatus: "error",
      warnings: ["calendar_runtime_error"],
    });

    const parsed = parseProviderDerivedRuntimePreviewRequest(validRequestBody);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const result = await handleProviderDerivedRuntimePreview(parsed.request, {
      env: allFlagsOnEnv,
      requestedAt,
      verifyGmailConnection,
      verifyCalendarConnection,
      executeComposition,
    });

    expect(result.status).toBe("partial");
  });

  it("returns blocked composition result without leaking secrets", async () => {
    verifyGmailConnection.mockResolvedValueOnce(notConnectedVerification("gmail"));
    verifyCalendarConnection.mockResolvedValueOnce(notConnectedVerification("calendar"));

    const parsed = parseProviderDerivedRuntimePreviewRequest(validRequestBody);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const result = await handleProviderDerivedRuntimePreview(parsed.request, {
      env: allFlagsOnEnv,
      requestedAt,
      verifyGmailConnection,
      verifyCalendarConnection,
      executeComposition,
    });

    const serialized = JSON.stringify(result);
    expect(result.status).toBe("blocked");
    expect(serialized).not.toMatch(/access_token|connectionId|end_user_id|providerPayload/i);
  });
});

describe("createBlockedProviderDerivedRuntimePreviewResult", () => {
  it("returns client-safe blocked preview without calling boundaries", () => {
    const result = createBlockedProviderDerivedRuntimePreviewResult("missing_consent");

    expect(result.status).toBe("blocked");
    expect(result.signals).toEqual([]);
    expect(result.processedMessageCount).toBe(0);
    expect(result.processedEventCount).toBe(0);
    expect(resolveProviderDerivedRuntimePreviewHttpStatus({ requestError: "missing_consent" })).toBe(
      403,
    );
    expect(
      resolveProviderDerivedRuntimePreviewHttpStatus({ requestError: "invalid_limits" }),
    ).toBe(400);
  });
});

describe("invalid request does not call verifiers or runtime boundaries", () => {
  const verifyGmailConnection = vi.fn(async () => connectedVerification("gmail"));
  const verifyCalendarConnection = vi.fn(async () => connectedVerification("calendar"));

  beforeEach(() => {
    vi.mocked(executeGmailReadOnlyNangoRuntime).mockClear();
    vi.mocked(executeCalendarReadOnlyNangoRuntime).mockClear();
    vi.mocked(executeCalendarReadOnlyNangoRuntime).mockClear();
    verifyGmailConnection.mockClear();
    verifyCalendarConnection.mockClear();
  });

  it("skips verifiers and boundaries when parse fails", async () => {
    const parsed = parseProviderDerivedRuntimePreviewRequest({ explicitConsent: false });

    expect(parsed.ok).toBe(false);
    expect(verifyGmailConnection).not.toHaveBeenCalled();
    expect(verifyCalendarConnection).not.toHaveBeenCalled();
    expect(executeGmailReadOnlyNangoRuntime).not.toHaveBeenCalled();
    expect(executeCalendarReadOnlyNangoRuntime).not.toHaveBeenCalled();
  });
});

describe("runtime boundary blocked results remain client-safe", () => {
  it("does not expose forbidden fields from blocked adapter results", () => {
    const gmailBlocked = createBlockedGmailReadOnlyAdapterResult({
      runtime: "nango",
      connectionVerified: false,
      reasons: ["connection_not_verified"],
    });
    const calendarBlocked = createBlockedCalendarReadOnlyAdapterResult({
      runtime: "nango",
      connectionVerified: false,
      reasons: ["connection_not_verified"],
    });
    const serialized = JSON.stringify({ gmailBlocked, calendarBlocked });

    expect(serialized).not.toMatch(/access_token|refresh_token|messageId|eventId/i);
  });
});
