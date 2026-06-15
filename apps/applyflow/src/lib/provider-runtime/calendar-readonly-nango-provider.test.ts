import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CALENDAR_EVENTS_LIST_ENDPOINT,
  CALENDAR_EVENTS_LIST_FIELDS,
  CALENDAR_RUNTIME_INTEGRATION_ID,
  createCalendarNangoRuntimeMetadataProvider,
  type CalendarNangoRuntimeSdk,
} from "./calendar-readonly-nango-provider.js";

const listConnections = vi.fn();
const get = vi.fn();

const sdk: CalendarNangoRuntimeSdk = {
  listConnections,
  get,
};

describe("createCalendarNangoRuntimeMetadataProvider", () => {
  beforeEach(() => {
    listConnections.mockReset();
    get.mockReset();
  });

  it("uses google-calendar integration and events.list endpoint", async () => {
    listConnections.mockResolvedValue({
      connections: [{ connection_id: "conn-cal-1" }],
    });
    get.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: "evt-secret-id",
            summary: "Interview with Acme",
            description: "secret description",
            location: "Office",
            status: "confirmed",
            start: { dateTime: "2026-06-20T14:00:00.000Z", timeZone: "UTC" },
            end: { dateTime: "2026-06-20T15:00:00.000Z", timeZone: "UTC" },
            organizer: { email: "recruiter@jobs.example" },
            attendees: [
              { email: "candidate@candidate.example" },
              { email: "recruiter@jobs.example" },
            ],
            conferenceData: {
              conferenceId: "conf-1",
              entryPoints: [{ uri: "https://meet.google.com/abc-def" }],
            },
            recurrence: ["RRULE:FREQ=WEEKLY"],
          },
        ],
      },
    });

    const provider = createCalendarNangoRuntimeMetadataProvider({
      secretKey: "test-secret",
      endUserId: "applyflow-calendar-runtime-boundary",
      sdk,
    });

    const metadata = await provider.listEventMetadata({
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-30T23:59:59.000Z",
      limit: 10,
    });

    expect(listConnections).toHaveBeenCalledWith({
      integrationId: CALENDAR_RUNTIME_INTEGRATION_ID,
      tags: { end_user_id: "applyflow-calendar-runtime-boundary" },
      limit: 1,
    });
    expect(get).toHaveBeenCalledWith({
      providerConfigKey: CALENDAR_RUNTIME_INTEGRATION_ID,
      connectionId: "conn-cal-1",
      endpoint: CALENDAR_EVENTS_LIST_ENDPOINT,
      params: {
        maxResults: 10,
        singleEvents: "true",
        orderBy: "startTime",
        fields: CALENDAR_EVENTS_LIST_FIELDS,
        timeMin: "2026-06-01T00:00:00.000Z",
        timeMax: "2026-06-30T23:59:59.000Z",
      },
    });

    expect(metadata).toHaveLength(1);
    expect(metadata[0]).toEqual({
      startsAt: "2026-06-20T14:00:00.000Z",
      endsAt: "2026-06-20T15:00:00.000Z",
      timezone: "UTC",
      status: "confirmed",
      isAllDay: false,
      attendeeCount: 2,
      externalAttendeeCount: 0,
      organizerDomain: "jobs.example",
      attendeeDomains: ["candidate.example", "jobs.example"],
      hasConference: true,
      isRecurring: true,
    });

    const serialized = JSON.stringify(metadata);
    expect(serialized).not.toMatch(/evt-secret-id|"summary"|"description"|"location"/i);
    expect(serialized).not.toMatch(/hangoutLink|meet\.google\.com|RRULE|access_token/i);
    expect(metadata[0]).not.toHaveProperty("eventId");
    expect(metadata[0]).not.toHaveProperty("calendarId");
    expect(metadata[0]).not.toHaveProperty("organizerEmail");
    expect(metadata[0]).not.toHaveProperty("attendeeEmails");
  });

  it("does not request forbidden fields in the fields parameter", () => {
    expect(CALENDAR_EVENTS_LIST_FIELDS).not.toMatch(/summary|description|location|hangoutLink/i);
    expect(CALENDAR_EVENTS_LIST_FIELDS).toMatch(/items\(/);
    expect(CALENDAR_EVENTS_LIST_ENDPOINT).toContain("/calendars/primary/events");
  });

  it("normalizes single-day all-day events with exclusive end.date", async () => {
    listConnections.mockResolvedValue({
      connections: [{ connection_id: "conn-cal-1" }],
    });
    get.mockResolvedValueOnce({
      data: {
        items: [
          {
            status: "confirmed",
            start: { date: "2026-06-20" },
            end: { date: "2026-06-21" },
          },
        ],
      },
    });

    const provider = createCalendarNangoRuntimeMetadataProvider({
      secretKey: "test-secret",
      sdk,
    });

    const metadata = await provider.listEventMetadata({ limit: 5 });

    expect(metadata).toHaveLength(1);
    expect(metadata[0]?.isAllDay).toBe(true);
    expect(metadata[0]?.startsAt).toBe("2026-06-20T00:00:00.000Z");
    expect(metadata[0]?.endsAt).toBe("2026-06-21T00:00:00.000Z");
  });

  it("normalizes multi-day all-day events with exclusive end.date", async () => {
    listConnections.mockResolvedValue({
      connections: [{ connection_id: "conn-cal-1" }],
    });
    get.mockResolvedValueOnce({
      data: {
        items: [
          {
            start: { date: "2026-06-20" },
            end: { date: "2026-06-23" },
          },
        ],
      },
    });

    const provider = createCalendarNangoRuntimeMetadataProvider({
      secretKey: "test-secret",
      sdk,
    });

    const metadata = await provider.listEventMetadata({ limit: 5 });

    expect(metadata[0]?.startsAt).toBe("2026-06-20T00:00:00.000Z");
    expect(metadata[0]?.endsAt).toBe("2026-06-23T00:00:00.000Z");
  });

  it("discards all-day events with invalid start date", async () => {
    listConnections.mockResolvedValue({
      connections: [{ connection_id: "conn-cal-1" }],
    });
    get.mockResolvedValueOnce({
      data: {
        items: [
          {
            start: { date: "invalid" },
            end: { date: "2026-06-21" },
          },
        ],
      },
    });

    const provider = createCalendarNangoRuntimeMetadataProvider({
      secretKey: "test-secret",
      sdk,
    });

    const metadata = await provider.listEventMetadata({ limit: 5 });

    expect(metadata).toEqual([]);
  });

  it("discards events when end is not after start", async () => {
    listConnections.mockResolvedValue({
      connections: [{ connection_id: "conn-cal-1" }],
    });
    get.mockResolvedValueOnce({
      data: {
        items: [
          {
            start: { dateTime: "2026-06-20T15:00:00.000Z" },
            end: { dateTime: "2026-06-20T14:00:00.000Z" },
          },
          {
            start: { date: "2026-06-20" },
            end: { date: "2026-06-20" },
          },
        ],
      },
    });

    const provider = createCalendarNangoRuntimeMetadataProvider({
      secretKey: "test-secret",
      sdk,
    });

    const metadata = await provider.listEventMetadata({ limit: 5 });

    expect(metadata).toEqual([]);
  });

  it("counts attendee entries and keeps unique attendee domains", async () => {
    listConnections.mockResolvedValue({
      connections: [{ connection_id: "conn-cal-1" }],
    });
    get.mockResolvedValueOnce({
      data: {
        items: [
          {
            start: { dateTime: "2026-06-20T10:00:00.000Z" },
            end: { dateTime: "2026-06-20T11:00:00.000Z" },
            attendees: [
              { email: "a@beta.example" },
              { email: "b@beta.example" },
              { email: "invalid" },
            ],
          },
        ],
      },
    });

    const provider = createCalendarNangoRuntimeMetadataProvider({
      secretKey: "test-secret",
      sdk,
    });

    const metadata = await provider.listEventMetadata({ limit: 5 });

    expect(metadata[0]?.attendeeCount).toBe(3);
    expect(metadata[0]?.externalAttendeeCount).toBe(0);
    expect(metadata[0]?.attendeeDomains).toEqual(["beta.example"]);
  });

  it("respects maxResults limit and stops at requested limit", async () => {
    listConnections.mockResolvedValue({
      connections: [{ connection_id: "conn-cal-1" }],
    });
    get.mockResolvedValueOnce({
      data: {
        items: [
          {
            start: { dateTime: "2026-06-19T10:00:00.000Z" },
            end: { dateTime: "2026-06-19T11:00:00.000Z" },
          },
          {
            start: { dateTime: "2026-06-20T10:00:00.000Z" },
            end: { dateTime: "2026-06-20T11:00:00.000Z" },
          },
          {
            start: { dateTime: "2026-06-21T10:00:00.000Z" },
            end: { dateTime: "2026-06-21T11:00:00.000Z" },
          },
        ],
        nextPageToken: "page-2",
      },
    });

    const provider = createCalendarNangoRuntimeMetadataProvider({
      secretKey: "test-secret",
      sdk,
    });

    const metadata = await provider.listEventMetadata({ limit: 2 });

    expect(get).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ maxResults: 2 }),
      }),
    );
    expect(metadata).toHaveLength(2);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("returns empty metadata when no connection exists", async () => {
    listConnections.mockResolvedValue({ connections: [] });

    const provider = createCalendarNangoRuntimeMetadataProvider({
      secretKey: "test-secret",
      sdk,
    });

    const metadata = await provider.listEventMetadata({ limit: 3 });

    expect(metadata).toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });
});
