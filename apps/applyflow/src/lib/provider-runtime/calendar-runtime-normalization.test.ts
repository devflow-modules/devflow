import { describe, expect, it } from "vitest";
import {
  detectCalendarHasConference,
  detectCalendarIsRecurring,
  extractCalendarEmailDomain,
  extractCalendarEmailDomains,
  isCalendarEventTimeWindowValid,
  normalizeCalendarEventEnd,
  normalizeCalendarEventStart,
  normalizeCalendarEventStatus,
} from "./calendar-runtime-normalization.js";

describe("extractCalendarEmailDomain", () => {
  it("extracts domain from display name without local-part", () => {
    expect(extractCalendarEmailDomain("Recruiter <USER@ACME.COM>")).toBe("acme.com");
    expect(extractCalendarEmailDomain("Organizer <organizer@acme.example>")).toBe("acme.example");
  });

  it("trims spaces and lowercases domain", () => {
    expect(extractCalendarEmailDomain(" USER@ACME.COM ")).toBe("acme.com");
  });

  it("returns undefined for invalid values", () => {
    expect(extractCalendarEmailDomain("not-an-email")).toBeUndefined();
    expect(extractCalendarEmailDomain("")).toBeUndefined();
    expect(extractCalendarEmailDomain(undefined)).toBeUndefined();
    expect(extractCalendarEmailDomain("user@")).toBeUndefined();
  });
});

describe("extractCalendarEmailDomains", () => {
  it("deduplicates and sorts attendee domains", () => {
    expect(
      extractCalendarEmailDomains([
        "a@beta.example",
        "b@beta.example",
        "c@acme.example",
        undefined,
        "invalid",
      ]),
    ).toEqual(["acme.example", "beta.example"]);
  });
});

describe("normalizeCalendarEventStart", () => {
  it("normalizes dateTime events with offset", () => {
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

  it("normalizes dateTime events in UTC", () => {
    expect(
      normalizeCalendarEventStart({
        dateTime: "2026-06-20T14:00:00.000Z",
      }),
    ).toEqual({
      startsAt: "2026-06-20T14:00:00.000Z",
      timezone: undefined,
      isAllDay: false,
    });
  });

  it("normalizes all-day start date", () => {
    expect(
      normalizeCalendarEventStart({
        date: "2026-06-20",
        timeZone: "UTC",
      }),
    ).toEqual({
      startsAt: "2026-06-20T00:00:00.000Z",
      timezone: "UTC",
      isAllDay: true,
    });
  });

  it("omits empty timezone", () => {
    expect(
      normalizeCalendarEventStart({
        dateTime: "2026-06-20T14:00:00.000Z",
        timeZone: "   ",
      }),
    ).toEqual({
      startsAt: "2026-06-20T14:00:00.000Z",
      timezone: undefined,
      isAllDay: false,
    });
  });

  it("returns empty start for invalid dateTime", () => {
    expect(normalizeCalendarEventStart({ dateTime: "invalid" })).toEqual({ isAllDay: false });
  });

  it("returns empty start for invalid all-day date", () => {
    expect(normalizeCalendarEventStart({ date: "invalid" })).toEqual({ isAllDay: false });
    expect(normalizeCalendarEventStart({ date: "2026-02-30" })).toEqual({ isAllDay: false });
  });
});

describe("normalizeCalendarEventEnd", () => {
  it("preserves exclusive all-day end.date as midnight UTC", () => {
    expect(normalizeCalendarEventEnd({ date: "2026-06-21" }, true)).toBe(
      "2026-06-21T00:00:00.000Z",
    );
  });

  it("normalizes dateTime end", () => {
    expect(
      normalizeCalendarEventEnd({ dateTime: "2026-06-20T15:00:00.000Z" }, false),
    ).toBe("2026-06-20T15:00:00.000Z");
  });

  it("returns undefined for invalid all-day end date", () => {
    expect(normalizeCalendarEventEnd({ date: "invalid" }, true)).toBeUndefined();
  });

  it("returns undefined for invalid dateTime end", () => {
    expect(normalizeCalendarEventEnd({ dateTime: "invalid" }, false)).toBeUndefined();
  });
});

describe("isCalendarEventTimeWindowValid", () => {
  it("accepts valid windows", () => {
    expect(
      isCalendarEventTimeWindowValid(
        "2026-06-20T00:00:00.000Z",
        "2026-06-21T00:00:00.000Z",
      ),
    ).toBe(true);
  });

  it("rejects equal or inverted windows", () => {
    expect(
      isCalendarEventTimeWindowValid(
        "2026-06-20T00:00:00.000Z",
        "2026-06-20T00:00:00.000Z",
      ),
    ).toBe(false);
    expect(
      isCalendarEventTimeWindowValid(
        "2026-06-21T00:00:00.000Z",
        "2026-06-20T00:00:00.000Z",
      ),
    ).toBe(false);
  });
});

describe("all-day Google Calendar semantics", () => {
  it("maps single-day all-day event with exclusive end.date", () => {
    const start = normalizeCalendarEventStart({ date: "2026-06-20" });
    const end = normalizeCalendarEventEnd({ date: "2026-06-21" }, true);

    expect(start).toEqual({
      startsAt: "2026-06-20T00:00:00.000Z",
      timezone: undefined,
      isAllDay: true,
    });
    expect(end).toBe("2026-06-21T00:00:00.000Z");
    expect(isCalendarEventTimeWindowValid(start.startsAt!, end!)).toBe(true);
  });

  it("maps multi-day all-day event with exclusive end.date", () => {
    const start = normalizeCalendarEventStart({ date: "2026-06-20" });
    const end = normalizeCalendarEventEnd({ date: "2026-06-23" }, true);

    expect(start.startsAt).toBe("2026-06-20T00:00:00.000Z");
    expect(end).toBe("2026-06-23T00:00:00.000Z");
    expect(start.isAllDay).toBe(true);
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

  it("does not expose conference payload in boolean result", () => {
    const serialized = JSON.stringify({
      hasConference: detectCalendarHasConference({
        conferenceId: "secret",
        entryPoints: [{ uri: "https://meet.google.com/abc" }],
      }),
    });

    expect(serialized).toBe('{"hasConference":true}');
    expect(serialized).not.toMatch(/conferenceId|entryPoints|meet\.google\.com/i);
  });
});

describe("detectCalendarIsRecurring", () => {
  it("detects recurrence without retaining rules", () => {
    expect(detectCalendarIsRecurring(["RRULE:FREQ=WEEKLY"])).toBe(true);
    expect(detectCalendarIsRecurring([])).toBe(false);
    expect(detectCalendarIsRecurring(undefined)).toBe(false);
    expect(detectCalendarIsRecurring("invalid")).toBe(false);
  });
});
