import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CALENDAR_READONLY_MAX_SAFE_EVENT_LIMIT,
  assertCalendarReadOnlySafetyPolicy,
  collectCalendarReadOnlyAdapterWarnings,
  createBlockedCalendarReadOnlyAdapterResult,
  createCalendarReadOnlyAdapterRequest,
  createCalendarReadOnlyAdapterResult,
  createCalendarReadOnlySafetyPolicy,
  evaluateCalendarReadOnlyAdapterRequest,
  isCalendarReadOnlyAdapterResultSafe,
  isCalendarReadOnlySafetyPolicySafe,
  type CalendarDerivedSignal,
  type CalendarReadOnlyRuntime,
} from "../src/calendar-readonly-adapter/index.js";

const requestedAt = "2026-06-15T12:00:00.000Z";

const sampleSignal: CalendarDerivedSignal = {
  id: "calendar-derived-signal-1",
  kind: "interview_scheduled",
  provider: "calendar",
  occurredAt: requestedAt,
  startsAt: "2026-06-16T14:00:00.000Z",
  company: "Example Corp",
  confidence: 0.68,
  reviewRequired: true,
  sourceCount: 1,
};

describe("CalendarReadOnlySafetyPolicy", () => {
  it("default policy is read-only and safe", () => {
    const policy = createCalendarReadOnlySafetyPolicy();

    expect(policy.readOnly).toBe(true);
    expect(policy.allowRawDescriptions).toBe(false);
    expect(policy.allowRawLocations).toBe(false);
    expect(policy.allowMeetingLinks).toBe(false);
    expect(policy.allowAttendeeAddresses).toBe(false);
    expect(policy.allowAttachments).toBe(false);
    expect(policy.allowRawProviderPayload).toBe(false);
    expect(policy.allowTokenExposure).toBe(false);
    expect(policy.requireVerifiedConnection).toBe(true);
    expect(policy.requireUserReview).toBe(true);
    expect(isCalendarReadOnlySafetyPolicySafe(policy)).toBe(true);
    expect(assertCalendarReadOnlySafetyPolicy(policy)).toEqual(policy);
  });

  it("rejects unsafe policy mutations", () => {
    const policy = createCalendarReadOnlySafetyPolicy();
    const tampered = { ...policy, allowMeetingLinks: true as unknown as false };

    expect(isCalendarReadOnlySafetyPolicySafe(tampered)).toBe(false);
    expect(() => assertCalendarReadOnlySafetyPolicy(tampered)).toThrow(
      /Unsafe Calendar read-only safety policy/,
    );
  });
});

describe("CalendarReadOnlyAdapterRequest", () => {
  it("blocks unverified connection", () => {
    const request = createCalendarReadOnlyAdapterRequest({
      runtime: "nango",
      connectionVerified: false,
      requestedAt,
    });
    const evaluation = evaluateCalendarReadOnlyAdapterRequest(request);

    expect(evaluation.status).toBe("blocked");
    expect(evaluation.reasons).toContain("connection_not_verified");
  });

  it("blocks zero event limit", () => {
    const request = createCalendarReadOnlyAdapterRequest({
      runtime: "nango",
      connectionVerified: true,
      requestedAt,
      window: { maxEvents: 0 },
    });
    const evaluation = evaluateCalendarReadOnlyAdapterRequest(request);

    expect(evaluation.status).toBe("blocked");
    expect(evaluation.reasons).toContain("unsafe_event_limit");
  });

  it("blocks event limit above safe maximum", () => {
    const request = createCalendarReadOnlyAdapterRequest({
      runtime: "nango",
      connectionVerified: true,
      requestedAt,
      window: { maxEvents: CALENDAR_READONLY_MAX_SAFE_EVENT_LIMIT + 1 },
    });
    const evaluation = evaluateCalendarReadOnlyAdapterRequest(request);

    expect(evaluation.status).toBe("blocked");
    expect(evaluation.reasons).toContain("unsafe_event_limit");
  });

  it("blocks invalid time window", () => {
    const request = createCalendarReadOnlyAdapterRequest({
      runtime: "nango",
      connectionVerified: true,
      requestedAt,
      window: {
        from: "2026-06-15T12:00:00.000Z",
        to: "2026-06-01T12:00:00.000Z",
        maxEvents: 10,
      },
    });
    const evaluation = evaluateCalendarReadOnlyAdapterRequest(request);

    expect(evaluation.status).toBe("blocked");
    expect(evaluation.reasons).toContain("invalid_time_window");
  });

  it("blocks unsupported runtime", () => {
    const request = createCalendarReadOnlyAdapterRequest({
      runtime: "nango",
      connectionVerified: true,
      requestedAt,
    });
    const tampered = {
      ...request,
      runtime: "manual" as unknown as CalendarReadOnlyRuntime,
    };
    const evaluation = evaluateCalendarReadOnlyAdapterRequest(tampered);

    expect(evaluation.status).toBe("blocked");
    expect(evaluation.reasons).toContain("runtime_not_supported");
  });

  it("allows valid verified request", () => {
    const request = createCalendarReadOnlyAdapterRequest({
      runtime: "nango",
      connectionVerified: true,
      requestedAt,
      window: { maxEvents: 10 },
    });
    const evaluation = evaluateCalendarReadOnlyAdapterRequest(request);

    expect(evaluation.status).toBe("ready");
    expect(evaluation.reasons).toHaveLength(0);
    expect(request.userReviewRequired).toBe(true);
  });
});

describe("CalendarReadOnlyAdapterResult", () => {
  it("creates blocked result with invariant safety flags", () => {
    const result = createBlockedCalendarReadOnlyAdapterResult({
      runtime: "nango",
      connectionVerified: false,
      reasons: ["connection_not_verified"],
    });

    expect(result.status).toBe("blocked");
    expect(result.safeForClient).toBe(true);
    expect(result.readOnly).toBe(true);
    expect(result.importedRawEvents).toBe(false);
    expect(result.retainedRawPayload).toBe(false);
    expect(result.retainedDescriptions).toBe(false);
    expect(result.retainedLocations).toBe(false);
    expect(result.retainedMeetingLinks).toBe(false);
    expect(result.retainedAttendeeAddresses).toBe(false);
    expect(result.hasToken).toBe(false);
    expect(isCalendarReadOnlyAdapterResultSafe(result)).toBe(true);
  });

  it("creates ready/completed results with derived signals only", () => {
    const ready = createCalendarReadOnlyAdapterResult({
      runtime: "sandbox",
      status: "ready",
      connectionVerified: true,
    });
    const completed = createCalendarReadOnlyAdapterResult({
      runtime: "sandbox",
      status: "completed",
      connectionVerified: true,
      signals: [sampleSignal],
      processedEventCount: 1,
    });

    expect(ready.status).toBe("ready");
    expect(completed.signals).toHaveLength(1);
    expect(completed.signals[0]?.reviewRequired).toBe(true);
    expect(completed.signals[0]?.confidence).toBeGreaterThanOrEqual(0);
    expect(completed.signals[0]?.confidence).toBeLessThanOrEqual(1);
    expect(isCalendarReadOnlyAdapterResultSafe(completed)).toBe(true);
  });

  it("serialized result does not contain secrets or raw provider payload markers", () => {
    const result = createCalendarReadOnlyAdapterResult({
      runtime: "nango",
      status: "completed",
      connectionVerified: true,
      signals: [sampleSignal],
    });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/access_token/i);
    expect(serialized).not.toMatch(/refresh_token/i);
    expect(serialized).not.toMatch(/client_secret/i);
    expect(serialized).not.toMatch(/"providerPayload"/i);
    expect(collectCalendarReadOnlyAdapterWarnings(result)).toHaveLength(0);
  });

  it("rejects signals with forbidden fields or unsafe confidence", () => {
    const unsafeSignal = {
      ...sampleSignal,
      title: "Interview with recruiter",
    } as CalendarDerivedSignal & { title: string };

    const result = createCalendarReadOnlyAdapterResult({
      runtime: "nango",
      status: "completed",
      connectionVerified: true,
      signals: [unsafeSignal],
    });

    expect(isCalendarReadOnlyAdapterResultSafe(result)).toBe(false);
    expect(collectCalendarReadOnlyAdapterWarnings(result).join(" ")).toMatch(/forbidden field: title/);

    const withDescription = {
      ...sampleSignal,
      description: "raw event notes",
    } as CalendarDerivedSignal & { description: string };
    const descriptionResult = createCalendarReadOnlyAdapterResult({
      runtime: "nango",
      status: "completed",
      connectionVerified: true,
      signals: [withDescription],
    });
    expect(isCalendarReadOnlyAdapterResultSafe(descriptionResult)).toBe(false);

    const withMeetingLink = {
      ...sampleSignal,
      meetingLink: "https://meet.google.com/abc",
    } as CalendarDerivedSignal & { meetingLink: string };
    const meetingResult = createCalendarReadOnlyAdapterResult({
      runtime: "nango",
      status: "completed",
      connectionVerified: true,
      signals: [withMeetingLink],
    });
    expect(isCalendarReadOnlyAdapterResultSafe(meetingResult)).toBe(false);

    const withEventId = {
      ...sampleSignal,
      eventId: "provider-event-123",
    } as CalendarDerivedSignal & { eventId: string };
    const eventIdResult = createCalendarReadOnlyAdapterResult({
      runtime: "nango",
      status: "completed",
      connectionVerified: true,
      signals: [withEventId],
    });
    expect(isCalendarReadOnlyAdapterResultSafe(eventIdResult)).toBe(false);

    const lowConfidence = { ...sampleSignal, confidence: 1.5 };
    const lowConfidenceResult = createCalendarReadOnlyAdapterResult({
      runtime: "nango",
      status: "completed",
      connectionVerified: true,
      signals: [lowConfidence],
    });
    expect(isCalendarReadOnlyAdapterResultSafe(lowConfidenceResult)).toBe(false);
  });
});

describe("calendar-readonly-adapter contract boundaries", () => {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const srcDir = join(moduleDir, "../src/calendar-readonly-adapter");

  it("does not import Nango SDK, googleapis, fetch, or process.env", () => {
    const files = ["types.ts", "safety.ts", "contract.ts", "index.ts"];
    const combined = files
      .map((file) => readFileSync(join(srcDir, file), "utf8"))
      .join("\n");

    expect(combined).not.toMatch(/from ['"]@nangohq/);
    expect(combined).not.toMatch(/from ['"]googleapis/);
    expect(combined).not.toMatch(/import\(['"]googleapis/);
    expect(combined).not.toMatch(/calendar\.events/);
    expect(combined).not.toMatch(/\bfetch\s*\(/);
    expect(combined).not.toMatch(/process\.env/);
  });
});
