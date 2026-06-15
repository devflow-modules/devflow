import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeApplyFlowCalendarReadOnlyRuntimeBoundary } from "./calendar-readonly-runtime-boundary.js";
import type { CalendarNangoRuntimeMetadataProvider } from "./calendar-readonly-nango-provider.js";

const allFlagsOnEnv = {
  CAREER_PROVIDER_RUNTIME_ENABLED: "true",
  NANGO_RUNTIME_ENABLED: "true",
  GMAIL_PROVIDER_ENABLED: "true",
  CALENDAR_PROVIDER_ENABLED: "true",
  NANGO_SECRET_KEY: "nango-secret-test",
};

const requestedAt = "2026-06-15T12:00:00.000Z";

const metadataProvider: CalendarNangoRuntimeMetadataProvider = {
  listEventMetadata: vi.fn(async () => [
    {
      startsAt: "2026-06-20T14:00:00.000Z",
      endsAt: "2026-06-20T15:00:00.000Z",
      status: "confirmed",
      isAllDay: false,
      attendeeCount: 2,
      externalAttendeeCount: 0,
      organizerDomain: "jobs.example",
      attendeeDomains: ["candidate.example"],
      hasConference: false,
      isRecurring: false,
    },
  ]),
};

describe("executeApplyFlowCalendarReadOnlyRuntimeBoundary", () => {
  beforeEach(() => {
    vi.mocked(metadataProvider.listEventMetadata).mockClear();
  });

  it("blocks when runtime flags are absent", async () => {
    const result = await executeApplyFlowCalendarReadOnlyRuntimeBoundary(
      { explicitConsent: true },
      {
        env: {},
        connectionVerified: true,
        requestedAt,
        runtimeDeps: { metadataProvider },
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("Provider runtime is disabled.");
    expect(metadataProvider.listEventMetadata).not.toHaveBeenCalled();
  });

  it("blocks when Nango runtime flag is false", async () => {
    const result = await executeApplyFlowCalendarReadOnlyRuntimeBoundary(
      { explicitConsent: true },
      {
        env: { ...allFlagsOnEnv, NANGO_RUNTIME_ENABLED: "false" },
        connectionVerified: true,
        requestedAt,
        runtimeDeps: { metadataProvider },
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("Nango runtime is disabled.");
    expect(metadataProvider.listEventMetadata).not.toHaveBeenCalled();
  });

  it("blocks when Calendar provider flag is false", async () => {
    const result = await executeApplyFlowCalendarReadOnlyRuntimeBoundary(
      { explicitConsent: true },
      {
        env: { ...allFlagsOnEnv, CALENDAR_PROVIDER_ENABLED: "false" },
        connectionVerified: true,
        requestedAt,
        runtimeDeps: { metadataProvider },
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("Calendar provider is disabled.");
    expect(metadataProvider.listEventMetadata).not.toHaveBeenCalled();
  });

  it("blocks when secret is missing", async () => {
    const result = await executeApplyFlowCalendarReadOnlyRuntimeBoundary(
      { explicitConsent: true },
      {
        env: { ...allFlagsOnEnv, NANGO_SECRET_KEY: "" },
        connectionVerified: true,
        requestedAt,
        runtimeDeps: { metadataProvider },
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings.join(" ")).toMatch(/secret key is required/i);
    expect(metadataProvider.listEventMetadata).not.toHaveBeenCalled();
  });

  it("blocks without explicit consent", async () => {
    const result = await executeApplyFlowCalendarReadOnlyRuntimeBoundary(
      { explicitConsent: false },
      {
        env: allFlagsOnEnv,
        connectionVerified: true,
        requestedAt,
        runtimeDeps: { metadataProvider },
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings.join(" ")).toMatch(/Explicit consent is required/i);
    expect(metadataProvider.listEventMetadata).not.toHaveBeenCalled();
  });

  it("blocks when connection is not verified", async () => {
    const result = await executeApplyFlowCalendarReadOnlyRuntimeBoundary(
      { explicitConsent: true },
      {
        env: allFlagsOnEnv,
        connectionVerified: false,
        requestedAt,
        runtimeDeps: { metadataProvider },
      },
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings.join(" ")).toMatch(/connection_not_verified/);
    expect(metadataProvider.listEventMetadata).not.toHaveBeenCalled();
  });

  it("executes adapter with injected metadata provider when gates pass", async () => {
    const result = await executeApplyFlowCalendarReadOnlyRuntimeBoundary(
      { explicitConsent: true },
      {
        env: allFlagsOnEnv,
        connectionVerified: true,
        requestedAt,
        runtimeDeps: { metadataProvider },
      },
    );

    expect(result.status).toBe("completed");
    expect(result.runtime).toBe("nango");
    expect(result.processedEventCount).toBe(1);
    expect(result.safeForClient).toBe(true);
    expect(result.readOnly).toBe(true);
    expect(result.importedRawEvents).toBe(false);
    expect(result.retainedRawPayload).toBe(false);
    expect(result.retainedDescriptions).toBe(false);
    expect(result.retainedLocations).toBe(false);
    expect(result.retainedMeetingLinks).toBe(false);
    expect(result.retainedAttendeeAddresses).toBe(false);
    expect(result.hasToken).toBe(false);
    expect(result.userReviewRequired).toBe(true);
    expect(metadataProvider.listEventMetadata).toHaveBeenCalledOnce();
  });

  it("returns sanitized provider error without partial data", async () => {
    const failingProvider: CalendarNangoRuntimeMetadataProvider = {
      listEventMetadata: vi.fn(async () => {
        throw new Error("nango sdk failure access_token");
      }),
    };

    const result = await executeApplyFlowCalendarReadOnlyRuntimeBoundary(
      { explicitConsent: true },
      {
        env: allFlagsOnEnv,
        connectionVerified: true,
        requestedAt,
        runtimeDeps: { metadataProvider: failingProvider },
      },
    );

    expect(result.status).toBe("error");
    expect(result.signals).toEqual([]);
    expect(JSON.stringify(result)).not.toMatch(/access_token/);
  });
});
