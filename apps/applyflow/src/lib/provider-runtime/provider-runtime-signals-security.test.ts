import { describe, expect, it } from "vitest";
import {
  composeAndLimitProviderRuntimeSignals,
  PROVIDER_RUNTIME_MAX_SIGNALS_PER_PREVIEW,
  PROVIDER_SIGNALS_TRUNCATED_WARNING,
} from "./provider-runtime-signal-limits.js";
import { executeProviderDerivedRuntimeComposition } from "./provider-derived-runtime-composition.js";
import {
  createCalendarReadOnlyAdapterResult,
  createGmailReadOnlyAdapterResult,
} from "@devflow/career-sync";
import { deriveCalendarRuntimeSignalsFromMetadata } from "./calendar-runtime-classifier.js";
import { deriveGmailRuntimeSignalsFromMetadata } from "./gmail-runtime-classifier.js";

const FORBIDDEN_SIGNAL_KEYS = [
  "subject",
  "snippet",
  "body",
  "description",
  "location",
  "meetinglink",
  "attendee",
  "messageid",
  "threadid",
  "eventid",
  "connectionid",
  "access_token",
  "refresh_token",
  "client_secret",
  "credentials",
] as const;

function assertSignalsDoNotExposeForbiddenFields(signals: Array<Record<string, unknown>>): void {
  for (const signal of signals) {
    const keys = Object.keys(signal).map((key) => key.toLowerCase());
    for (const forbiddenKey of FORBIDDEN_SIGNAL_KEYS) {
      expect(keys).not.toContain(forbiddenKey);
    }
  }

  const serialized = JSON.stringify(signals).toLowerCase();
  expect(serialized).not.toContain("nango_secret_key=");
  expect(serialized).not.toContain("authorization:");
}

describe("composeAndLimitProviderRuntimeSignals", () => {
  it("truncates signals and reports truncation through composition warnings", async () => {
    const gmailSignals = Array.from({ length: 20 }, (_, index) => ({
      id: `provider-signal-gmail-provider_email_activity-2026-06-10T10-00-00-000Z-${String(index + 1).padStart(3, "0")}`,
      kind: "provider_email_activity" as const,
      provider: "gmail" as const,
      occurredAt: `2026-06-10T10:${String(index).padStart(2, "0")}:00.000Z`,
      confidence: 0.9,
      reviewRequired: true as const,
      sourceCount: 1,
    }));

    const calendarSignals = Array.from({ length: 10 }, (_, index) => ({
      id: `provider-signal-calendar-provider_calendar_activity-2026-06-11T10-00-00-000Z-${String(index + 1).padStart(3, "0")}`,
      kind: "provider_calendar_activity" as const,
      provider: "calendar" as const,
      occurredAt: `2026-06-11T10:${String(index).padStart(2, "0")}:00.000Z`,
      confidence: 0.9,
      reviewRequired: true as const,
      sourceCount: 1,
    }));

    const limited = composeAndLimitProviderRuntimeSignals({
      gmailSignals,
      calendarSignals,
      maxSignals: PROVIDER_RUNTIME_MAX_SIGNALS_PER_PREVIEW,
    });

    expect(limited.truncated).toBe(true);
    expect(limited.signals).toHaveLength(PROVIDER_RUNTIME_MAX_SIGNALS_PER_PREVIEW);

    const result = await executeProviderDerivedRuntimeComposition({
      referenceMs: Date.parse("2026-06-20T12:00:00.000Z"),
      executeGmail: async () => ({
        result: createGmailReadOnlyAdapterResult({
          runtime: "nango",
          status: "completed",
          connectionVerified: true,
          signals: gmailSignals,
          processedMessageCount: gmailSignals.length,
        }),
        metadata: [],
      }),
      executeCalendar: async () => ({
        result: createCalendarReadOnlyAdapterResult({
          runtime: "nango",
          status: "completed",
          connectionVerified: true,
          signals: calendarSignals,
          processedEventCount: calendarSignals.length,
        }),
        metadata: [],
      }),
    });

    expect(result.warnings).toContain(PROVIDER_SIGNALS_TRUNCATED_WARNING);
    expect(result.signals).toHaveLength(PROVIDER_RUNTIME_MAX_SIGNALS_PER_PREVIEW);
  });
});

describe("provider runtime signal security", () => {
  it("does not leak forbidden fragments in composed runtime preview output", async () => {
    const gmailMetadata = [
      {
        occurredAt: "2026-06-18T10:00:00.000Z",
        direction: "inbound" as const,
        senderDomain: "company.example",
        recipientDomains: ["candidate.example"],
        hasAttachment: false,
      },
    ];
    const calendarMetadata = [
      {
        startsAt: "2026-06-25T14:00:00.000Z",
        endsAt: "2026-06-25T15:00:00.000Z",
        status: "confirmed" as const,
        isAllDay: false,
        attendeeCount: 2,
        externalAttendeeCount: 0,
        organizerDomain: "company.example",
        attendeeDomains: ["candidate.example"],
        hasConference: false,
        isRecurring: false,
      },
    ];
    const referenceMs = Date.parse("2026-06-20T12:00:00.000Z");

    const result = await executeProviderDerivedRuntimeComposition({
      referenceMs,
      executeGmail: async () => ({
        result: createGmailReadOnlyAdapterResult({
          runtime: "nango",
          status: "completed",
          connectionVerified: true,
          signals: deriveGmailRuntimeSignalsFromMetadata(gmailMetadata),
          processedMessageCount: gmailMetadata.length,
        }),
        metadata: gmailMetadata,
      }),
      executeCalendar: async () => ({
        result: createCalendarReadOnlyAdapterResult({
          runtime: "nango",
          status: "completed",
          connectionVerified: true,
          signals: deriveCalendarRuntimeSignalsFromMetadata(calendarMetadata, { referenceMs }),
          processedEventCount: calendarMetadata.length,
        }),
        metadata: calendarMetadata,
      }),
    });

    assertSignalsDoNotExposeForbiddenFields(result.signals as Array<Record<string, unknown>>);

    expect(result.hasToken).toBe(false);
    expect(result.safeForClient).toBe(true);
    expect(result.retainedBodies).toBe(false);
    expect(result.retainedSnippets).toBe(false);
    expect(result.importedRawProviderData).toBe(false);
    expect(result.signals.length).toBeGreaterThan(0);
  });
});
