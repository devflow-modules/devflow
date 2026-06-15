import { describe, expect, it } from "vitest";
import { deriveCalendarRuntimeSignalsFromMetadata } from "./calendar-runtime-classifier.js";

describe("deriveCalendarRuntimeSignalsFromMetadata", () => {
  it("returns no signals for real metadata in the conservative first runtime", () => {
    const signals = deriveCalendarRuntimeSignalsFromMetadata([
      {
        startsAt: "2026-06-20T14:00:00.000Z",
        endsAt: "2026-06-20T15:00:00.000Z",
        status: "confirmed",
        isAllDay: false,
        attendeeCount: 3,
        externalAttendeeCount: 0,
        organizerDomain: "jobs.example",
        attendeeDomains: ["candidate.example", "jobs.example"],
        hasConference: true,
        isRecurring: false,
      },
    ]);

    expect(signals).toEqual([]);
  });
});
