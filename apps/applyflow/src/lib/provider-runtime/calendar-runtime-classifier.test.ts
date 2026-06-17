import { describe, expect, it } from "vitest";
import {
  deriveCalendarRuntimeSignalsFromMetadata,
  resolveCalendarDurationBucket,
} from "./calendar-runtime-classifier.js";

const REFERENCE_MS = Date.parse("2026-06-20T12:00:00.000Z");

function sampleEvent(
  overrides?: Partial<Parameters<typeof deriveCalendarRuntimeSignalsFromMetadata>[0][number]>,
) {
  return {
    startsAt: "2026-06-25T14:00:00.000Z",
    endsAt: "2026-06-25T15:00:00.000Z",
    status: "confirmed" as const,
    isAllDay: false,
    attendeeCount: 2,
    externalAttendeeCount: 0,
    organizerDomain: "company.example",
    attendeeDomains: ["candidate.example"],
    hasConference: true,
    isRecurring: false,
    ...overrides,
  };
}

describe("deriveCalendarRuntimeSignalsFromMetadata", () => {
  it("returns zero signals for empty metadata", () => {
    expect(deriveCalendarRuntimeSignalsFromMetadata([])).toEqual([]);
  });

  it("returns calendar activity for a future event", () => {
    const signals = deriveCalendarRuntimeSignalsFromMetadata([sampleEvent()], {
      referenceMs: REFERENCE_MS,
    });

    expect(signals).toHaveLength(1);
    expect(signals[0]?.kind).toBe("provider_calendar_activity");
    expect(signals[0]?.reason).toContain("future");
  });

  it("returns factual calendar activity for a past event", () => {
    const signals = deriveCalendarRuntimeSignalsFromMetadata(
      [
        sampleEvent({
          startsAt: "2026-06-10T14:00:00.000Z",
          endsAt: "2026-06-10T15:00:00.000Z",
        }),
      ],
      { referenceMs: REFERENCE_MS },
    );

    expect(signals[0]?.reason).toContain("past");
  });

  it("uses deterministic duration buckets", () => {
    expect(
      resolveCalendarDurationBucket("2026-06-10T14:00:00.000Z", "2026-06-10T14:20:00.000Z"),
    ).toBe("short");
    expect(
      resolveCalendarDurationBucket("2026-06-10T14:00:00.000Z", "2026-06-10T15:00:00.000Z"),
    ).toBe("medium");
    expect(
      resolveCalendarDurationBucket("2026-06-10T14:00:00.000Z", "2026-06-10T18:00:00.000Z"),
    ).toBe("long");
  });

  it("does not include sensitive fields as signal keys", () => {
    const signals = deriveCalendarRuntimeSignalsFromMetadata([sampleEvent()], {
      referenceMs: REFERENCE_MS,
    });

    for (const signal of signals) {
      const keys = Object.keys(signal).map((key) => key.toLowerCase());
      expect(keys).not.toContain("description");
      expect(keys).not.toContain("location");
      expect(keys).not.toContain("meetinglink");
      expect(keys).not.toContain("attendeeemail");
      expect(keys).not.toContain("eventid");
    }
  });

  it("rejects invalid events", () => {
    const signals = deriveCalendarRuntimeSignalsFromMetadata([
      sampleEvent({ startsAt: "2026-06-25T15:00:00.000Z", endsAt: "2026-06-25T14:00:00.000Z" }),
    ]);

    expect(signals).toEqual([]);
  });

  it("does not infer interview_scheduled from hasConference alone", () => {
    const signals = deriveCalendarRuntimeSignalsFromMetadata([sampleEvent({ hasConference: true })]);

    expect(signals.every((signal) => signal.kind === "provider_calendar_activity")).toBe(true);
  });
});
