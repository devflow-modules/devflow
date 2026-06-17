import { describe, expect, it } from "vitest";
import {
  deriveProviderActivityClusterSignals,
  deriveProviderFollowUpWindowSignals,
} from "./provider-runtime-correlation-classifier.js";
import { CORRELATION_WINDOW_MS } from "./calendar-runtime-classifier.js";

const REFERENCE_MS = Date.parse("2026-06-20T12:00:00.000Z");

describe("deriveProviderActivityClusterSignals", () => {
  it("creates a cluster when email occurs within 72h before a future event", () => {
    const clusters = deriveProviderActivityClusterSignals({
      referenceMs: REFERENCE_MS,
      gmailMetadata: [
        {
          occurredAt: "2026-06-19T10:00:00.000Z",
          direction: "inbound",
          senderDomain: "company.example",
          recipientDomains: ["candidate.example"],
          hasAttachment: false,
        },
      ],
      calendarMetadata: [
        {
          startsAt: "2026-06-20T14:00:00.000Z",
          endsAt: "2026-06-20T15:00:00.000Z",
          status: "confirmed",
          isAllDay: false,
          attendeeCount: 2,
          externalAttendeeCount: 0,
          organizerDomain: "company.example",
          attendeeDomains: ["candidate.example"],
          hasConference: false,
          isRecurring: false,
        },
      ],
    });

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.kind).toBe("provider_activity_cluster");
    expect(clusters[0]?.reason).toContain("related provider activity may require review");
    expect(clusters[0]?.reason).toContain("were not analyzed");
  });

  it("does not create a cluster when email is outside the 72h window", () => {
    const clusters = deriveProviderActivityClusterSignals({
      referenceMs: REFERENCE_MS,
      gmailMetadata: [
        {
          occurredAt: "2026-06-16T10:00:00.000Z",
          direction: "inbound",
          senderDomain: "company.example",
          recipientDomains: ["candidate.example"],
          hasAttachment: false,
        },
      ],
      calendarMetadata: [
        {
          startsAt: "2026-06-20T14:00:00.000Z",
          endsAt: "2026-06-20T15:00:00.000Z",
          status: "confirmed",
          isAllDay: false,
          attendeeCount: 2,
          externalAttendeeCount: 0,
          organizerDomain: "company.example",
          attendeeDomains: ["candidate.example"],
          hasConference: false,
          isRecurring: false,
        },
      ],
    });

    expect(clusters).toEqual([]);
  });

  it("deduplicates multiple emails for the same event bucket", () => {
    const clusters = deriveProviderActivityClusterSignals({
      referenceMs: REFERENCE_MS,
      gmailMetadata: [
        {
          occurredAt: "2026-06-19T10:00:00.000Z",
          direction: "inbound",
          senderDomain: "company.example",
          recipientDomains: ["candidate.example"],
          hasAttachment: false,
        },
        {
          occurredAt: "2026-06-19T10:15:00.000Z",
          direction: "inbound",
          senderDomain: "company.example",
          recipientDomains: ["candidate.example"],
          hasAttachment: false,
        },
      ],
      calendarMetadata: [
        {
          startsAt: "2026-06-20T14:00:00.000Z",
          endsAt: "2026-06-20T15:00:00.000Z",
          status: "confirmed",
          isAllDay: false,
          attendeeCount: 2,
          externalAttendeeCount: 0,
          organizerDomain: "company.example",
          attendeeDomains: ["candidate.example"],
          hasConference: false,
          isRecurring: false,
        },
      ],
    });

    expect(clusters).toHaveLength(1);
  });

  it("treats the 72h window as inclusive at the boundary", () => {
    const eventStartsAt = "2026-06-20T14:00:00.000Z";
    const emailOccurredAt = new Date(Date.parse(eventStartsAt) - CORRELATION_WINDOW_MS).toISOString();

    const clusters = deriveProviderActivityClusterSignals({
      referenceMs: REFERENCE_MS,
      gmailMetadata: [
        {
          occurredAt: emailOccurredAt,
          direction: "outbound",
          senderDomain: "company.example",
          recipientDomains: ["candidate.example"],
          hasAttachment: false,
        },
      ],
      calendarMetadata: [
        {
          startsAt: eventStartsAt,
          endsAt: "2026-06-20T15:00:00.000Z",
          status: "confirmed",
          isAllDay: false,
          attendeeCount: 2,
          externalAttendeeCount: 0,
          organizerDomain: "company.example",
          attendeeDomains: ["candidate.example"],
          hasConference: false,
          isRecurring: false,
        },
      ],
    });

    expect(clusters).toHaveLength(1);
  });
});

describe("deriveProviderFollowUpWindowSignals", () => {
  it("does not emit follow-up when direction is unknown", () => {
    const followUps = deriveProviderFollowUpWindowSignals({
      referenceMs: REFERENCE_MS,
      gmailMetadata: [
        {
          occurredAt: "2026-06-18T10:00:00.000Z",
          direction: "unknown",
          senderDomain: "company.example",
          recipientDomains: ["candidate.example"],
          hasAttachment: false,
        },
      ],
      clusterSignals: [],
    });

    expect(followUps).toEqual([]);
  });

  it("emits follow-up for known direction without correlated event", () => {
    const followUps = deriveProviderFollowUpWindowSignals({
      referenceMs: REFERENCE_MS,
      gmailMetadata: [
        {
          occurredAt: "2026-06-18T10:00:00.000Z",
          direction: "inbound",
          senderDomain: "company.example",
          recipientDomains: ["candidate.example"],
          hasAttachment: false,
        },
      ],
      clusterSignals: [],
    });

    expect(followUps).toHaveLength(1);
    expect(followUps[0]?.kind).toBe("provider_follow_up_window");
    expect(followUps[0]?.confidenceLevel).toBe("low");
  });

  it("skips follow-up when a cluster exists for the same email", () => {
    const clusterSignals = deriveProviderActivityClusterSignals({
      referenceMs: REFERENCE_MS,
      gmailMetadata: [
        {
          occurredAt: "2026-06-19T10:00:00.000Z",
          direction: "inbound",
          senderDomain: "company.example",
          recipientDomains: ["candidate.example"],
          hasAttachment: false,
        },
      ],
      calendarMetadata: [
        {
          startsAt: "2026-06-20T14:00:00.000Z",
          endsAt: "2026-06-20T15:00:00.000Z",
          status: "confirmed",
          isAllDay: false,
          attendeeCount: 2,
          externalAttendeeCount: 0,
          organizerDomain: "company.example",
          attendeeDomains: ["candidate.example"],
          hasConference: false,
          isRecurring: false,
        },
      ],
    });

    const followUps = deriveProviderFollowUpWindowSignals({
      referenceMs: REFERENCE_MS,
      gmailMetadata: [
        {
          occurredAt: "2026-06-19T10:00:00.000Z",
          direction: "inbound",
          senderDomain: "company.example",
          recipientDomains: ["candidate.example"],
          hasAttachment: false,
        },
      ],
      clusterSignals,
    });

    expect(followUps).toEqual([]);
  });
});
