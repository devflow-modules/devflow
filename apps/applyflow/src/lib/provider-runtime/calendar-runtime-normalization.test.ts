import { describe, expect, it } from "vitest";
import {
  detectCalendarHasConference,
  detectCalendarIsRecurring,
  extractCalendarEmailDomain,
  extractCalendarEmailDomains,
  normalizeCalendarEventEnd,
  normalizeCalendarEventStart,
  normalizeCalendarEventStatus,
} from "./calendar-runtime-normalization.js";

describe("extractCalendarEmailDomain", () => {
  it("extracts domain without local-part", () => {
    expect(extractCalendarEmailDomain("Organizer <organizer@acme.example>")).toBe("acme.example");
  });

  it("returns undefined for invalid values", () => {
    expect(extractCalendarEmailDomain("not-an-email")).toBeUndefined();
  });
});

describe("extractCalendarEmailDomains", () => {
  it("deduplicates and sorts attendee domains", () => {
    expect(
      extractCalendarEmailDomains([
        "a@beta.example",
        "b@beta.example",
        "c@acme.example",
      ]),
    ).toEqual(["acme.example", "beta.example"]);
  });
});

describe("normalizeCalendarEventStart", () => {
  it("normalizes dateTime events", () => {
    expect(
      normalizeCalendarEventStart({
        dateTime: "2026-06-20T14:00:00+01:00",
        timeZone: "Europe/Lisbon",
      }),
    ).toEqual({
      startsAt: "2026-06-20T13:00:00.000Z",
      timezone: "Europe/Lisbon",
      isAllDay: false,
    });
  });

  it("normalizes all-day events", () => {
    expect(
      normalizeCalendarEventStart({
        date: "2026-06-25",
        timeZone: "UTC",
      }),
    ).toEqual({
      startsAt: "2026-06-25T00:00:00.000Z",
      timezone: "UTC",
      isAllDay: true,
    });
  });

  it("returns empty start for invalid input", () => {
    expect(normalizeCalendarEventStart({ dateTime: "invalid" })).toEqual({ isAllDay: false });
  });
});

describe("normalizeCalendarEventEnd", () => {
  it("normalizes all-day end", () => {
    expect(normalizeCalendarEventEnd({ date: "2026-06-25" }, true)).toBe(
      "2026-06-25T23:59:59.000Z",
    );
  });

  it("normalizes dateTime end", () => {
    expect(
      normalizeCalendarEventEnd({ dateTime: "2026-06-20T15:00:00.000Z" }, false),
    ).toBe("2026-06-20T15:00:00.000Z");
  });
});

describe("normalizeCalendarEventStatus", () => {
  it("maps known statuses", () => {
    expect(normalizeCalendarEventStatus("confirmed")).toBe("confirmed");
    expect(normalizeCalendarEventStatus("tentative")).toBe("tentative");
    expect(normalizeCalendarEventStatus("cancelled")).toBe("cancelled");
  });

  it("maps unknown status to unknown", () => {
    expect(normalizeCalendarEventStatus("needsAction")).toBe("unknown");
  });
});

describe("detectCalendarHasConference", () => {
  it("detects conference presence without retaining payload", () => {
    expect(detectCalendarHasConference({ conferenceId: "abc" })).toBe(true);
    expect(detectCalendarHasConference({ entryPoints: [{ uri: "https://meet.google.com/x" }] })).toBe(
      true,
    );
    expect(detectCalendarHasConference(undefined)).toBe(false);
  });
});

describe("detectCalendarIsRecurring", () => {
  it("detects recurrence without retaining rules", () => {
    expect(detectCalendarIsRecurring(["RRULE:FREQ=WEEKLY"])).toBe(true);
    expect(detectCalendarIsRecurring([])).toBe(false);
  });
});
