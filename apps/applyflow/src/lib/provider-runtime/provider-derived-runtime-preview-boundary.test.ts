import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createBlockedCalendarReadOnlyAdapterResult,
  createBlockedGmailReadOnlyAdapterResult,
  createCalendarReadOnlyAdapterResult,
  createEmptyProviderDerivedSignalSummary,
  createGmailReadOnlyAdapterResult,
} from "@devflow/career-sync";
import { executeApplyFlowCalendarReadOnlyRuntimeBoundary } from "./calendar-readonly-runtime-boundary.js";
import { executeApplyFlowGmailReadOnlyRuntimeBoundary } from "./gmail-readonly-runtime-boundary.js";
import {
  createBlockedProviderDerivedRuntimePreviewResult,
  handleProviderDerivedRuntimePreview,
  parseProviderDerivedRuntimePreviewRequest,
  resolveProviderDerivedRuntimePreviewHttpStatus,
} from "./provider-derived-runtime-preview-boundary.js";
import type { ProviderDerivedRuntimeCompositionResult } from "./provider-derived-runtime-composition.js";

vi.mock("./gmail-readonly-runtime-boundary.js", () => ({
  executeApplyFlowGmailReadOnlyRuntimeBoundary: vi.fn(),
}));

vi.mock("./calendar-readonly-runtime-boundary.js", () => ({
  executeApplyFlowCalendarReadOnlyRuntimeBoundary: vi.fn(),
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
  gmailConnectionVerified: true,
  calendarConnectionVerified: true,
  limits: { maxMessages: 10, maxEvents: 10 },
};

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
  it("accepts a valid preview request", () => {
    const parsed = parseProviderDerivedRuntimePreviewRequest(validRequestBody);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.request.limits.maxMessages).toBe(10);
      expect(parsed.request.limits.maxEvents).toBe(10);
    }
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

  it("rejects unverified Gmail", () => {
    const parsed = parseProviderDerivedRuntimePreviewRequest({
      ...validRequestBody,
      gmailConnectionVerified: false,
    });

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toBe("gmail_not_verified");
    }
  });

  it("rejects unverified Calendar", () => {
    const parsed = parseProviderDerivedRuntimePreviewRequest({
      ...validRequestBody,
      calendarConnectionVerified: false,
    });

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toBe("calendar_not_verified");
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
  const executeComposition = vi.fn(async (input: {
    executeGmail: () => Promise<unknown>;
    executeCalendar: () => Promise<unknown>;
  }) => {
    await input.executeGmail();
    await input.executeCalendar();
    return completedCompositionResult();
  });

  beforeEach(() => {
    vi.mocked(executeApplyFlowGmailReadOnlyRuntimeBoundary).mockReset();
    vi.mocked(executeApplyFlowCalendarReadOnlyRuntimeBoundary).mockReset();
    executeComposition.mockReset();
    executeComposition.mockImplementation(async (input: {
      executeGmail: () => Promise<unknown>;
      executeCalendar: () => Promise<unknown>;
    }) => {
      await input.executeGmail();
      await input.executeCalendar();
      return completedCompositionResult();
    });

    vi.mocked(executeApplyFlowGmailReadOnlyRuntimeBoundary).mockResolvedValue(
      createGmailReadOnlyAdapterResult({
        runtime: "nango",
        status: "completed",
        connectionVerified: true,
        processedMessageCount: 2,
      }),
    );
    vi.mocked(executeApplyFlowCalendarReadOnlyRuntimeBoundary).mockResolvedValue(
      createCalendarReadOnlyAdapterResult({
        runtime: "nango",
        status: "completed",
        connectionVerified: true,
        processedEventCount: 3,
      }),
    );
  });

  it("calls Gmail and Calendar boundaries and composition once for valid request", async () => {
    const parsed = parseProviderDerivedRuntimePreviewRequest(validRequestBody);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const result = await handleProviderDerivedRuntimePreview(parsed.request, {
      env: allFlagsOnEnv,
      requestedAt,
      executeComposition,
    });

    expect(executeComposition).toHaveBeenCalledOnce();
    expect(executeApplyFlowGmailReadOnlyRuntimeBoundary).toHaveBeenCalledOnce();
    expect(executeApplyFlowCalendarReadOnlyRuntimeBoundary).toHaveBeenCalledOnce();
    expect(result.status).toBe("completed");
  });

  it("passes window and limits to runtime boundaries", async () => {
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
      executeComposition,
    });

    expect(executeApplyFlowGmailReadOnlyRuntimeBoundary).toHaveBeenCalledWith(
      { explicitConsent: true },
      expect.objectContaining({
        window: expect.objectContaining({ maxMessages: 5 }),
      }),
    );
    expect(executeApplyFlowCalendarReadOnlyRuntimeBoundary).toHaveBeenCalledWith(
      { explicitConsent: true },
      expect.objectContaining({
        window: expect.objectContaining({ maxEvents: 7 }),
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
      executeComposition,
    });

    expect(result.status).toBe("partial");
  });

  it("returns blocked composition result without leaking secrets", async () => {
    executeComposition.mockResolvedValueOnce({
      ...completedCompositionResult(),
      status: "blocked",
      gmailStatus: "blocked",
      calendarStatus: "blocked",
      warnings: ["gmail_blocked"],
      messages: ["Provider-derived runtime composition was blocked by runtime safety gates."],
    });

    const parsed = parseProviderDerivedRuntimePreviewRequest(validRequestBody);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const result = await handleProviderDerivedRuntimePreview(parsed.request, {
      env: allFlagsOnEnv,
      requestedAt,
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

describe("invalid request does not call runtime boundaries", () => {
  beforeEach(() => {
    vi.mocked(executeApplyFlowGmailReadOnlyRuntimeBoundary).mockClear();
    vi.mocked(executeApplyFlowCalendarReadOnlyRuntimeBoundary).mockClear();
  });

  it("skips boundaries when parse fails", () => {
    const parsed = parseProviderDerivedRuntimePreviewRequest({ explicitConsent: false });

    expect(parsed.ok).toBe(false);
    expect(executeApplyFlowGmailReadOnlyRuntimeBoundary).not.toHaveBeenCalled();
    expect(executeApplyFlowCalendarReadOnlyRuntimeBoundary).not.toHaveBeenCalled();
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
