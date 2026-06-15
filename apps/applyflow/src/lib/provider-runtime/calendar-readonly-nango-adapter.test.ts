import { describe, expect, it, vi } from "vitest";
import {
  createCalendarReadOnlyAdapterRequest,
  isCalendarReadOnlyAdapterResultSafe,
} from "@devflow/career-sync";
import { createCalendarReadOnlyNangoRuntimeAdapter } from "./calendar-readonly-nango-adapter.js";
import type { CalendarNangoRuntimeMetadataProvider } from "./calendar-readonly-nango-provider.js";

const requestedAt = "2026-06-15T12:00:00.000Z";

function nangoRequest() {
  return createCalendarReadOnlyAdapterRequest({
    runtime: "nango",
    connectionVerified: true,
    requestedAt,
  });
}

describe("createCalendarReadOnlyNangoRuntimeAdapter", () => {
  it("blocks non-nango runtime", async () => {
    const provider: CalendarNangoRuntimeMetadataProvider = {
      listEventMetadata: vi.fn(async () => []),
    };
    const adapter = createCalendarReadOnlyNangoRuntimeAdapter({ metadataProvider: provider });

    const result = await adapter.execute(
      createCalendarReadOnlyAdapterRequest({
        runtime: "sandbox",
        connectionVerified: true,
        requestedAt,
      }),
    );

    expect(result.status).toBe("blocked");
    expect(provider.listEventMetadata).not.toHaveBeenCalled();
  });

  it("blocks unverified connection", async () => {
    const provider: CalendarNangoRuntimeMetadataProvider = {
      listEventMetadata: vi.fn(async () => []),
    };
    const adapter = createCalendarReadOnlyNangoRuntimeAdapter({ metadataProvider: provider });

    const result = await adapter.execute(
      createCalendarReadOnlyAdapterRequest({
        runtime: "nango",
        connectionVerified: false,
        requestedAt,
      }),
    );

    expect(result.status).toBe("blocked");
    expect(provider.listEventMetadata).not.toHaveBeenCalled();
  });

  it("blocks unsafe event limit", async () => {
    const provider: CalendarNangoRuntimeMetadataProvider = {
      listEventMetadata: vi.fn(async () => []),
    };
    const adapter = createCalendarReadOnlyNangoRuntimeAdapter({ metadataProvider: provider });

    const result = await adapter.execute(
      createCalendarReadOnlyAdapterRequest({
        runtime: "nango",
        connectionVerified: true,
        requestedAt,
        window: { maxEvents: 100 },
      }),
    );

    expect(result.status).toBe("blocked");
    expect(provider.listEventMetadata).not.toHaveBeenCalled();
  });

  it("completes with zero signals when metadata has no safe runtime evidence", async () => {
    const provider: CalendarNangoRuntimeMetadataProvider = {
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
          hasConference: true,
          isRecurring: false,
        },
      ]),
    };
    const adapter = createCalendarReadOnlyNangoRuntimeAdapter({ metadataProvider: provider });

    const result = await adapter.execute(nangoRequest());

    expect(result.status).toBe("completed");
    expect(result.processedEventCount).toBe(1);
    expect(result.signals).toEqual([]);
    expect(result.importedRawEvents).toBe(false);
    expect(result.retainedRawPayload).toBe(false);
    expect(result.retainedDescriptions).toBe(false);
    expect(result.retainedLocations).toBe(false);
    expect(result.retainedMeetingLinks).toBe(false);
    expect(result.retainedAttendeeAddresses).toBe(false);
    expect(result.hasToken).toBe(false);
    expect(result.userReviewRequired).toBe(true);
    expect(isCalendarReadOnlyAdapterResultSafe(result)).toBe(true);
    expect(result.messages[0]).toMatch(/No raw event content was retained/i);
  });

  it("returns sanitized error when provider fails", async () => {
    const provider: CalendarNangoRuntimeMetadataProvider = {
      listEventMetadata: vi.fn(async () => {
        throw new Error("calendar failure access_token summary description");
      }),
    };
    const adapter = createCalendarReadOnlyNangoRuntimeAdapter({ metadataProvider: provider });

    const result = await adapter.execute(nangoRequest());

    expect(result.status).toBe("error");
    expect(result.signals).toEqual([]);
    expect(result.messages).toContain("Calendar read-only runtime processing failed safely.");
    expect(JSON.stringify(result)).not.toMatch(/access_token/i);
    expect(JSON.stringify(result)).not.toMatch(/"summary"/i);
    expect(JSON.stringify(result)).not.toMatch(/"description"/i);
    expect(JSON.stringify(result)).not.toMatch(/stack/i);
  });

  it("does not expose forbidden fields in completed result", async () => {
    const provider: CalendarNangoRuntimeMetadataProvider = {
      listEventMetadata: vi.fn(async () => [
        {
          startsAt: "2026-06-20T14:00:00.000Z",
          endsAt: "2026-06-20T15:00:00.000Z",
          status: "confirmed",
          isAllDay: false,
          attendeeCount: 1,
          externalAttendeeCount: 0,
          organizerDomain: "acme.example",
          attendeeDomains: ["candidate.example"],
          hasConference: false,
          isRecurring: false,
        },
      ]),
    };
    const adapter = createCalendarReadOnlyNangoRuntimeAdapter({ metadataProvider: provider });
    const result = await adapter.execute(nangoRequest());
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/"summary"/i);
    expect(serialized).not.toMatch(/"description"/i);
    expect(serialized).not.toMatch(/"location"/i);
    expect(serialized).not.toMatch(/hangoutLink|"meetingLink"/i);
    expect(serialized).not.toMatch(/eventId|calendarId/i);
    expect(serialized).not.toMatch(/organizerEmail|attendeeEmail/i);
    expect(serialized).not.toMatch(/access_token/i);
    expect(serialized).not.toMatch(/refresh_token/i);
    expect(serialized).not.toMatch(/client_secret/i);
    expect(serialized).not.toMatch(/"providerPayload"/i);
    expect(serialized).not.toMatch(/"recurrence"/i);
  });
});
