import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyProviderDerivedSignalSummary } from "@devflow/career-sync";
import { GET, POST } from "./route";

const handlePreview = vi.fn();

vi.mock("@/lib/provider-runtime/nango-connect-session-launcher", () => ({
  readApplyFlowNangoConnectSessionEnv: () => ({
    CAREER_PROVIDER_RUNTIME_ENABLED: "true",
    NANGO_RUNTIME_ENABLED: "true",
    GMAIL_PROVIDER_ENABLED: "true",
    CALENDAR_PROVIDER_ENABLED: "true",
    NANGO_SECRET_KEY: "nango-secret-test",
  }),
}));

vi.mock("@/lib/provider-runtime/provider-derived-runtime-preview-boundary", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/provider-runtime/provider-derived-runtime-preview-boundary")
  >("@/lib/provider-runtime/provider-derived-runtime-preview-boundary");

  return {
    ...actual,
    handleProviderDerivedRuntimePreview: (...args: unknown[]) => handlePreview(...args),
  };
});

const validBody = {
  explicitConsent: true,
  gmailConnectionVerified: true,
  calendarConnectionVerified: true,
  limits: { maxMessages: 10, maxEvents: 10 },
};

function completedResult() {
  return {
    runtime: "nango" as const,
    status: "completed" as const,
    safeForClient: true as const,
    readOnly: true,
    userReviewRequired: true,
    gmailStatus: "completed" as const,
    calendarStatus: "completed" as const,
    processedMessageCount: 2,
    processedEventCount: 3,
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
}

function makePostRequest(body: unknown) {
  return new Request("http://localhost/provider-runtime/nango/derived-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /provider-runtime/nango/derived-preview", () => {
  beforeEach(() => {
    handlePreview.mockReset();
    handlePreview.mockResolvedValue(completedResult());
  });

  it("rejects invalid JSON with 400", async () => {
    const request = new Request("http://localhost/provider-runtime/nango/derived-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });

    const response = await POST(request as never);
    expect(response.status).toBe(400);
    expect(handlePreview).not.toHaveBeenCalled();
  });

  it("rejects missing consent with 403", async () => {
    const response = await POST(
      makePostRequest({ ...validBody, explicitConsent: false }) as never,
    );
    expect(response.status).toBe(403);
    expect(handlePreview).not.toHaveBeenCalled();
  });

  it("rejects unverified Gmail with 403", async () => {
    const response = await POST(
      makePostRequest({ ...validBody, gmailConnectionVerified: false }) as never,
    );
    expect(response.status).toBe(403);
    expect(handlePreview).not.toHaveBeenCalled();
  });

  it("rejects unverified Calendar with 403", async () => {
    const response = await POST(
      makePostRequest({ ...validBody, calendarConnectionVerified: false }) as never,
    );
    expect(response.status).toBe(403);
    expect(handlePreview).not.toHaveBeenCalled();
  });

  it("rejects invalid maxMessages limits", async () => {
    for (const maxMessages of [0, 51]) {
      const response = await POST(
        makePostRequest({ ...validBody, limits: { maxMessages, maxEvents: 10 } }) as never,
      );
      expect(response.status).toBe(400);
    }
    expect(handlePreview).not.toHaveBeenCalled();
  });

  it("rejects invalid maxEvents limits", async () => {
    for (const maxEvents of [0, 51]) {
      const response = await POST(
        makePostRequest({ ...validBody, limits: { maxMessages: 10, maxEvents } }) as never,
      );
      expect(response.status).toBe(400);
    }
    expect(handlePreview).not.toHaveBeenCalled();
  });

  it("rejects invalid window", async () => {
    const response = await POST(
      makePostRequest({
        ...validBody,
        window: {
          from: "2026-06-30T00:00:00.000Z",
          to: "2026-06-01T00:00:00.000Z",
        },
      }) as never,
    );
    expect(response.status).toBe(400);
    expect(handlePreview).not.toHaveBeenCalled();
  });

  it("calls preview handler once for valid request", async () => {
    const response = await POST(makePostRequest(validBody) as never);
    expect(response.status).toBe(200);
    expect(handlePreview).toHaveBeenCalledOnce();
  });

  it("returns client-safe completed body", async () => {
    const response = await POST(makePostRequest(validBody) as never);
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(body.status).toBe("completed");
    expect(serialized).not.toMatch(
      /access_token|refresh_token|connectionId|end_user_id|providerPayload|"snippet":|"subject":/i,
    );
    expect(serialized).not.toMatch(/CareerBundle|buildCareerBundle/i);
  });

  it("returns client-safe partial body", async () => {
    handlePreview.mockResolvedValueOnce({
      ...completedResult(),
      status: "partial",
      calendarStatus: "error",
      warnings: ["calendar_runtime_error"],
      messages: [
        "Read-only provider preview completed partially. Available signals require manual review.",
      ],
    });

    const response = await POST(makePostRequest(validBody) as never);
    const body = await response.json();

    expect(body.status).toBe("partial");
    expect(JSON.stringify(body)).not.toMatch(/stack|connectionId/i);
  });

  it("returns client-safe blocked body from runtime", async () => {
    handlePreview.mockResolvedValueOnce({
      ...completedResult(),
      status: "blocked",
      gmailStatus: "blocked",
      calendarStatus: "blocked",
    });

    const response = await POST(makePostRequest(validBody) as never);
    const body = await response.json();

    expect(body.status).toBe("blocked");
    expect(JSON.stringify(body)).not.toMatch(/access_token|connectionId/i);
  });

  it("returns sanitized error body on handler failure", async () => {
    handlePreview.mockRejectedValueOnce(new Error("secret stack trace"));

    const response = await POST(makePostRequest(validBody) as never);
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(500);
    expect(body.status).toBe("error");
    expect(serialized).not.toMatch(/secret stack trace|stack/i);
  });
});

describe("GET /provider-runtime/nango/derived-preview", () => {
  beforeEach(() => {
    handlePreview.mockClear();
  });

  it("rejects non-POST method with 405", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
    expect(handlePreview).not.toHaveBeenCalled();
  });
});
