import { describe, expect, it, vi } from "vitest";
import {
  createBlockedCalendarReadOnlyAdapterResult,
  createBlockedGmailReadOnlyAdapterResult,
  createCalendarReadOnlyAdapterResult,
  createGmailReadOnlyAdapterResult,
  type CalendarDerivedSignal,
  type GmailDerivedSignal,
} from "@devflow/career-sync";
import {
  executeProviderDerivedRuntimeComposition,
  isSafeCalendarRuntimeResult,
  isSafeGmailRuntimeResult,
} from "./provider-derived-runtime-composition.js";

function gmailSignal(overrides?: Partial<GmailDerivedSignal>): GmailDerivedSignal {
  return {
    id: "gmail-runtime-application_detected-2026-06-11T09-00-00-000Z-0",
    kind: "application_detected",
    provider: "gmail",
    occurredAt: "2026-06-11T09:00:00.000Z",
    company: "Acme",
    confidence: 0.85,
    reviewRequired: true,
    sourceCount: 1,
    ...overrides,
  };
}

function calendarSignal(overrides?: Partial<CalendarDerivedSignal>): CalendarDerivedSignal {
  return {
    id: "calendar-runtime-interview_scheduled-2026-06-20T14-00-00-000Z-0",
    kind: "interview_scheduled",
    provider: "calendar",
    occurredAt: "2026-06-20T14:00:00.000Z",
    startsAt: "2026-06-20T14:00:00.000Z",
    company: "Acme",
    confidence: 0.9,
    reviewRequired: true,
    sourceCount: 3,
    ...overrides,
  };
}

function completedGmailResult(input?: {
  signals?: GmailDerivedSignal[];
  processedMessageCount?: number;
}) {
  return createGmailReadOnlyAdapterResult({
    runtime: "nango",
    status: "completed",
    connectionVerified: true,
    signals: input?.signals ?? [],
    processedMessageCount: input?.processedMessageCount ?? 0,
  });
}

function completedCalendarResult(input?: {
  signals?: CalendarDerivedSignal[];
  processedEventCount?: number;
}) {
  return createCalendarReadOnlyAdapterResult({
    runtime: "nango",
    status: "completed",
    connectionVerified: true,
    signals: input?.signals ?? [],
    processedEventCount: input?.processedEventCount ?? 0,
  });
}

function blockedGmailResult() {
  return createBlockedGmailReadOnlyAdapterResult({
    runtime: "nango",
    connectionVerified: false,
    reasons: ["connection_not_verified"],
  });
}

function blockedCalendarResult() {
  return createBlockedCalendarReadOnlyAdapterResult({
    runtime: "nango",
    connectionVerified: false,
    reasons: ["connection_not_verified"],
  });
}

function errorGmailResult() {
  return createGmailReadOnlyAdapterResult({
    runtime: "nango",
    status: "error",
    connectionVerified: true,
    warnings: ["gmail_readonly_runtime_processing_failed"],
  });
}

function errorCalendarResult() {
  return createCalendarReadOnlyAdapterResult({
    runtime: "nango",
    status: "error",
    connectionVerified: true,
    warnings: ["calendar_readonly_runtime_processing_failed"],
  });
}

function unsafeGmailResult() {
  const unsafeSignal = {
    ...gmailSignal(),
    subject: "secret subject",
  } as GmailDerivedSignal & { subject: string };

  return createGmailReadOnlyAdapterResult({
    runtime: "nango",
    status: "completed",
    connectionVerified: true,
    signals: [unsafeSignal],
    processedMessageCount: 1,
  });
}

function unsafeCalendarResult() {
  const unsafeSignal = {
    ...calendarSignal(),
    title: "secret title",
  } as CalendarDerivedSignal & { title: string };

  return createCalendarReadOnlyAdapterResult({
    runtime: "nango",
    status: "completed",
    connectionVerified: true,
    signals: [unsafeSignal],
    processedEventCount: 1,
  });
}

describe("isSafeGmailRuntimeResult", () => {
  it("accepts completed safe Gmail runtime results", () => {
    expect(isSafeGmailRuntimeResult(completedGmailResult())).toBe(true);
  });

  it("rejects unsafe Gmail runtime results", () => {
    expect(isSafeGmailRuntimeResult(unsafeGmailResult())).toBe(false);
  });
});

describe("isSafeCalendarRuntimeResult", () => {
  it("accepts completed safe Calendar runtime results", () => {
    expect(isSafeCalendarRuntimeResult(completedCalendarResult())).toBe(true);
  });

  it("rejects unsafe Calendar runtime results", () => {
    expect(isSafeCalendarRuntimeResult(unsafeCalendarResult())).toBe(false);
  });
});

describe("executeProviderDerivedRuntimeComposition", () => {
  it("returns completed when Gmail and Calendar complete", async () => {
    const result = await executeProviderDerivedRuntimeComposition({
      executeGmail: async () =>
        completedGmailResult({ signals: [gmailSignal()], processedMessageCount: 2 }),
      executeCalendar: async () =>
        completedCalendarResult({ signals: [calendarSignal()], processedEventCount: 3 }),
    });

    expect(result.status).toBe("completed");
    expect(result.gmailStatus).toBe("completed");
    expect(result.calendarStatus).toBe("completed");
    expect(result.signals).toHaveLength(2);
    expect(result.summary.totalSignals).toBe(2);
    expect(result.processedMessageCount).toBe(2);
    expect(result.processedEventCount).toBe(3);
    expect(result.messages[0]).toMatch(/No raw provider data was retained/i);
  });

  it("returns completed when both providers complete with zero signals", async () => {
    const result = await executeProviderDerivedRuntimeComposition({
      executeGmail: async () => completedGmailResult({ processedMessageCount: 4 }),
      executeCalendar: async () => completedCalendarResult({ processedEventCount: 5 }),
    });

    expect(result.status).toBe("completed");
    expect(result.signals).toEqual([]);
    expect(result.summary.totalSignals).toBe(0);
    expect(result.processedMessageCount).toBe(4);
    expect(result.processedEventCount).toBe(5);
  });

  it("returns partial when Gmail completes and Calendar is blocked", async () => {
    const result = await executeProviderDerivedRuntimeComposition({
      executeGmail: async () =>
        completedGmailResult({ signals: [gmailSignal()], processedMessageCount: 1 }),
      executeCalendar: async () => blockedCalendarResult(),
    });

    expect(result.status).toBe("partial");
    expect(result.gmailStatus).toBe("completed");
    expect(result.calendarStatus).toBe("blocked");
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0]?.source).toBe("gmail");
    expect(result.processedMessageCount).toBe(1);
    expect(result.processedEventCount).toBe(0);
    expect(result.warnings).toEqual(["calendar_blocked"]);
  });

  it("returns partial when Gmail is blocked and Calendar completes", async () => {
    const result = await executeProviderDerivedRuntimeComposition({
      executeGmail: async () => blockedGmailResult(),
      executeCalendar: async () =>
        completedCalendarResult({ signals: [calendarSignal()], processedEventCount: 2 }),
    });

    expect(result.status).toBe("partial");
    expect(result.gmailStatus).toBe("blocked");
    expect(result.calendarStatus).toBe("completed");
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0]?.source).toBe("calendar");
    expect(result.processedMessageCount).toBe(0);
    expect(result.processedEventCount).toBe(2);
    expect(result.warnings).toEqual(["gmail_blocked"]);
  });

  it("returns partial when Gmail completes and Calendar errors", async () => {
    const result = await executeProviderDerivedRuntimeComposition({
      executeGmail: async () =>
        completedGmailResult({ signals: [gmailSignal()], processedMessageCount: 1 }),
      executeCalendar: async () => errorCalendarResult(),
    });

    expect(result.status).toBe("partial");
    expect(result.warnings).toEqual(["calendar_runtime_error"]);
    expect(result.signals).toHaveLength(1);
    expect(result.processedEventCount).toBe(0);
  });

  it("returns partial when Gmail errors and Calendar completes", async () => {
    const result = await executeProviderDerivedRuntimeComposition({
      executeGmail: async () => errorGmailResult(),
      executeCalendar: async () =>
        completedCalendarResult({ signals: [calendarSignal()], processedEventCount: 1 }),
    });

    expect(result.status).toBe("partial");
    expect(result.warnings).toEqual(["gmail_runtime_error"]);
    expect(result.signals).toHaveLength(1);
    expect(result.processedEventCount).toBe(1);
    expect(result.processedMessageCount).toBe(0);
  });

  it("returns blocked when both providers are blocked", async () => {
    const result = await executeProviderDerivedRuntimeComposition({
      executeGmail: async () => blockedGmailResult(),
      executeCalendar: async () => blockedCalendarResult(),
    });

    expect(result.status).toBe("blocked");
    expect(result.signals).toEqual([]);
    expect(result.summary.totalSignals).toBe(0);
    expect(result.processedMessageCount).toBe(0);
    expect(result.processedEventCount).toBe(0);
    expect(result.warnings).toEqual(["gmail_blocked", "calendar_blocked"]);
    expect(result.messages[0]).toMatch(/blocked by runtime safety gates/i);
  });

  it("returns error when both providers error", async () => {
    const result = await executeProviderDerivedRuntimeComposition({
      executeGmail: async () => errorGmailResult(),
      executeCalendar: async () => errorCalendarResult(),
    });

    expect(result.status).toBe("error");
    expect(result.signals).toEqual([]);
    expect(result.warnings).toEqual(["gmail_runtime_error", "calendar_runtime_error"]);
  });

  it("returns partial when Gmail is unsafe and Calendar completes", async () => {
    const result = await executeProviderDerivedRuntimeComposition({
      executeGmail: async () => unsafeGmailResult(),
      executeCalendar: async () =>
        completedCalendarResult({ signals: [calendarSignal()], processedEventCount: 1 }),
    });

    expect(result.status).toBe("partial");
    expect(result.gmailStatus).toBe("error");
    expect(result.warnings).toContain("gmail_unsafe_result");
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0]?.source).toBe("calendar");
    expect(result.processedMessageCount).toBe(0);
  });

  it("returns partial when Calendar is unsafe and Gmail completes", async () => {
    const result = await executeProviderDerivedRuntimeComposition({
      executeGmail: async () =>
        completedGmailResult({ signals: [gmailSignal()], processedMessageCount: 1 }),
      executeCalendar: async () => unsafeCalendarResult(),
    });

    expect(result.status).toBe("partial");
    expect(result.calendarStatus).toBe("error");
    expect(result.warnings).toContain("calendar_unsafe_result");
    expect(result.signals).toHaveLength(1);
    expect(result.processedMessageCount).toBe(1);
    expect(result.processedEventCount).toBe(0);
  });

  it("returns error when both providers are unsafe", async () => {
    const result = await executeProviderDerivedRuntimeComposition({
      executeGmail: async () => unsafeGmailResult(),
      executeCalendar: async () => unsafeCalendarResult(),
    });

    expect(result.status).toBe("error");
    expect(result.signals).toEqual([]);
    expect(result.warnings).toEqual(["gmail_unsafe_result", "calendar_unsafe_result"]);
  });

  it("sanitizes Gmail executor rejection", async () => {
    const result = await executeProviderDerivedRuntimeComposition({
      executeGmail: async () => {
        throw new Error("gmail access_token connectionId evt-1 stack");
      },
      executeCalendar: async () => completedCalendarResult(),
    });

    const serialized = JSON.stringify(result);

    expect(result.status).toBe("partial");
    expect(result.warnings).toContain("gmail_runtime_error");
    expect(serialized).not.toMatch(/access_token|connectionId|evt-1|stack/i);
  });

  it("sanitizes Calendar executor rejection", async () => {
    const result = await executeProviderDerivedRuntimeComposition({
      executeGmail: async () => completedGmailResult(),
      executeCalendar: async () => {
        throw new Error("calendar refresh_token eventId calendarId");
      },
    });

    const serialized = JSON.stringify(result);

    expect(result.status).toBe("partial");
    expect(result.warnings).toContain("calendar_runtime_error");
    expect(serialized).not.toMatch(/refresh_token|eventId|calendarId/i);
  });

  it("starts both executors without waiting sequentially", async () => {
    const order: string[] = [];

    const result = await executeProviderDerivedRuntimeComposition({
      executeGmail: async () => {
        order.push("gmail-start");
        await new Promise((resolve) => setTimeout(resolve, 40));
        order.push("gmail-end");
        return completedGmailResult();
      },
      executeCalendar: async () => {
        order.push("calendar-start");
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push("calendar-end");
        return completedCalendarResult();
      },
    });

    expect(result.status).toBe("completed");
    expect(order.indexOf("calendar-start")).toBeLessThan(order.indexOf("gmail-end"));
    expect(order.indexOf("gmail-start")).toBeLessThan(order.indexOf("calendar-end"));
  });

  it("preserves deterministic signal ordering via composeProviderDerivedSignals", async () => {
    const result = await executeProviderDerivedRuntimeComposition({
      executeGmail: async () =>
        completedGmailResult({
          signals: [
            gmailSignal({
              id: "gmail-runtime-b-2026-06-20T14-00-00-000Z-0",
              occurredAt: "2026-06-20T14:00:00.000Z",
              kind: "follow_up_required",
            }),
          ],
        }),
      executeCalendar: async () =>
        completedCalendarResult({
          signals: [
            calendarSignal({
              id: "calendar-runtime-a-2026-06-20T14-00-00-000Z-0",
              occurredAt: "2026-06-20T14:00:00.000Z",
            }),
          ],
        }),
    });

    expect(result.signals.map((signal) => signal.source)).toEqual(["calendar", "gmail"]);
  });

  it("does not mutate provider signal inputs", async () => {
    const gmailSignals = [gmailSignal()];
    const calendarSignals = [calendarSignal()];
    const gmailSnapshot = structuredClone(gmailSignals);
    const calendarSnapshot = structuredClone(calendarSignals);

    await executeProviderDerivedRuntimeComposition({
      executeGmail: async () => completedGmailResult({ signals: gmailSignals }),
      executeCalendar: async () => completedCalendarResult({ signals: calendarSignals }),
    });

    expect(gmailSignals).toEqual(gmailSnapshot);
    expect(calendarSignals).toEqual(calendarSnapshot);
  });

  it("does not expose forbidden fields in the composition result", async () => {
    const result = await executeProviderDerivedRuntimeComposition({
      executeGmail: async () =>
        completedGmailResult({ signals: [gmailSignal()], processedMessageCount: 1 }),
      executeCalendar: async () =>
        completedCalendarResult({ signals: [calendarSignal()], processedEventCount: 1 }),
    });

    const serialized = JSON.stringify(result);

    expect(result.safeForClient).toBe(true);
    expect(result.readOnly).toBe(true);
    expect(result.userReviewRequired).toBe(true);
    expect(result.importedRawProviderData).toBe(false);
    expect(result.retainedRawPayload).toBe(false);
    expect(result.retainedBodies).toBe(false);
    expect(result.retainedSnippets).toBe(false);
    expect(result.retainedDescriptions).toBe(false);
    expect(result.retainedLocations).toBe(false);
    expect(result.retainedMeetingLinks).toBe(false);
    expect(result.retainedProviderIdentifiers).toBe(false);
    expect(result.retainedAttendeeAddresses).toBe(false);
    expect(result.hasToken).toBe(false);

    const signalsSerialized = JSON.stringify(result.signals);

    expect(signalsSerialized).not.toMatch(/"snippet":|"body":|"summary":|"description":|"location":/i);
    expect(serialized).not.toMatch(/hangoutLink|"meetingLink":/i);
    expect(serialized).not.toMatch(/messageId|threadId|eventId|calendarId/i);
    expect(serialized).not.toMatch(/connectionId|end_user_id/i);
    expect(serialized).not.toMatch(/access_token|refresh_token|client_secret|providerPayload/i);
  });
});
