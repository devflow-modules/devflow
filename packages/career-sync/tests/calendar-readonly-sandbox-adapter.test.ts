import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CALENDAR_READONLY_MAX_SAFE_EVENT_LIMIT,
  CALENDAR_SANDBOX_FIXTURE_APPLICATION_DEADLINE,
  CALENDAR_SANDBOX_FIXTURE_FOLLOW_UP_EVENT_DUE,
  CALENDAR_SANDBOX_FIXTURE_INTERVIEW_CANCELLED,
  CALENDAR_SANDBOX_FIXTURE_INTERVIEW_RESCHEDULED,
  CALENDAR_SANDBOX_FIXTURE_INTERVIEW_SCHEDULED,
  CALENDAR_SANDBOX_FIXTURE_MULTI_SIGNAL,
  CALENDAR_SANDBOX_FIXTURE_NO_CAREER_SIGNAL,
  CALENDAR_SANDBOX_FIXTURE_RECRUITER_CALL_LIKELY,
  createCalendarReadOnlyAdapterRequest,
  createCalendarReadOnlySandboxAdapter,
  createCalendarSandboxMetadataProvider,
  createCalendarSandboxScenarioProvider,
  deriveCalendarSignalsFromSandboxEvents,
  getCalendarSandboxFixture,
  isCalendarReadOnlyAdapterResultSafe,
  type CalendarReadOnlyAdapterRequest,
  type CalendarReadOnlyMetadataProvider,
  type CalendarSandboxScenarioProvider,
} from "../src/calendar-readonly-adapter/index.js";

const requestedAt = "2026-06-15T12:00:00.000Z";

function verifiedSandboxRequest(
  overrides?: Partial<Parameters<typeof createCalendarReadOnlyAdapterRequest>[0]>,
): CalendarReadOnlyAdapterRequest {
  return createCalendarReadOnlyAdapterRequest({
    runtime: "sandbox",
    connectionVerified: true,
    requestedAt,
    ...overrides,
  });
}

function adapterForFixture(fixture = CALENDAR_SANDBOX_FIXTURE_INTERVIEW_SCHEDULED) {
  return createCalendarReadOnlySandboxAdapter({
    fixtureProvider: createCalendarSandboxScenarioProvider(fixture),
  });
}

describe("createCalendarReadOnlySandboxAdapter", () => {
  it("implements CalendarReadOnlyAdapter contract", async () => {
    const adapter = adapterForFixture();
    const result = await adapter.execute(verifiedSandboxRequest());

    expect(result.provider).toBe("calendar");
    expect(result.runtime).toBe("sandbox");
    expect(typeof adapter.execute).toBe("function");
  });

  it("blocks non-sandbox runtime", async () => {
    const adapter = adapterForFixture();
    const result = await adapter.execute(
      createCalendarReadOnlyAdapterRequest({
        runtime: "nango",
        connectionVerified: true,
        requestedAt,
      }),
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings.join(" ")).toMatch(/runtime_not_supported|sandbox runtime only/i);
  });

  it("blocks unverified connection", async () => {
    const adapter = adapterForFixture();
    const result = await adapter.execute(
      verifiedSandboxRequest({ connectionVerified: false }),
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings.join(" ")).toMatch(/connection_not_verified/);
  });

  it("blocks unsafe event limit", async () => {
    const adapter = adapterForFixture();
    const result = await adapter.execute(
      verifiedSandboxRequest({
        window: { maxEvents: CALENDAR_READONLY_MAX_SAFE_EVENT_LIMIT + 1 },
      }),
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings.join(" ")).toMatch(/unsafe_event_limit/);
  });

  it("blocks invalid time window", async () => {
    const adapter = adapterForFixture();
    const result = await adapter.execute(
      verifiedSandboxRequest({
        window: {
          from: "2026-06-15T12:00:00.000Z",
          to: "2026-06-01T12:00:00.000Z",
          maxEvents: 5,
        },
      }),
    );

    expect(result.status).toBe("blocked");
    expect(result.warnings.join(" ")).toMatch(/invalid_time_window/);
  });
});

describe("sandbox fixture classification", () => {
  const cases = [
    { fixture: CALENDAR_SANDBOX_FIXTURE_INTERVIEW_SCHEDULED, kind: "interview_scheduled" },
    { fixture: CALENDAR_SANDBOX_FIXTURE_INTERVIEW_RESCHEDULED, kind: "interview_rescheduled" },
    { fixture: CALENDAR_SANDBOX_FIXTURE_INTERVIEW_CANCELLED, kind: "interview_cancelled" },
    { fixture: CALENDAR_SANDBOX_FIXTURE_RECRUITER_CALL_LIKELY, kind: "recruiter_call_likely" },
    { fixture: CALENDAR_SANDBOX_FIXTURE_FOLLOW_UP_EVENT_DUE, kind: "follow_up_event_due" },
    { fixture: CALENDAR_SANDBOX_FIXTURE_APPLICATION_DEADLINE, kind: "application_deadline_detected" },
  ] as const;

  for (const { fixture, kind } of cases) {
    it(`fixture ${fixture.fixtureId} generates ${kind}`, async () => {
      const adapter = adapterForFixture(fixture);
      const result = await adapter.execute(verifiedSandboxRequest());

      expect(result.status).toBe("completed");
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0]?.kind).toBe(kind);
      expect(result.signals[0]?.reviewRequired).toBe(true);
      expect(result.signals[0]?.confidence).toBeGreaterThanOrEqual(0);
      expect(result.signals[0]?.confidence).toBeLessThanOrEqual(1);
      expect(isCalendarReadOnlyAdapterResultSafe(result)).toBe(true);
    });
  }

  it("fixture without career scenario returns empty signals", async () => {
    const adapter = adapterForFixture(CALENDAR_SANDBOX_FIXTURE_NO_CAREER_SIGNAL);
    const result = await adapter.execute(verifiedSandboxRequest());

    expect(result.status).toBe("completed");
    expect(result.signals).toHaveLength(0);
    expect(result.processedEventCount).toBe(1);
  });

  it("multi-signal fixture keeps deterministic ordering", async () => {
    const adapter = adapterForFixture(CALENDAR_SANDBOX_FIXTURE_MULTI_SIGNAL);
    const result = await adapter.execute(verifiedSandboxRequest());

    expect(result.status).toBe("completed");
    expect(result.signals).toHaveLength(2);
    expect(result.signals[0]?.kind).toBe("interview_scheduled");
    expect(result.signals[1]?.kind).toBe("application_deadline_detected");
    expect(result.signals[0]?.occurredAt.localeCompare(result.signals[1]?.occurredAt ?? "")).toBeLessThanOrEqual(0);
  });

  it("produces deterministic output for the same input", async () => {
    const adapter = adapterForFixture(CALENDAR_SANDBOX_FIXTURE_MULTI_SIGNAL);
    const request = verifiedSandboxRequest();

    const first = await adapter.execute(request);
    const second = await adapter.execute(request);

    expect(first).toEqual(second);
    expect(first.signals).toHaveLength(2);
    expect(first.signals[0]?.id).toMatch(/^calendar-sandbox-/);
  });

  it("uses deterministic signal IDs", () => {
    const signals = deriveCalendarSignalsFromSandboxEvents(CALENDAR_SANDBOX_FIXTURE_MULTI_SIGNAL.events);

    expect(signals.map((signal) => signal.id)).toEqual([
      "calendar-sandbox-interview_scheduled-2026-06-26T14-00-00-000Z-0",
      "calendar-sandbox-application_deadline_detected-2026-06-27T00-00-00-000Z-1",
    ]);
  });

  it("derives company only from sandbox company slug", async () => {
    const adapter = adapterForFixture(CALENDAR_SANDBOX_FIXTURE_INTERVIEW_SCHEDULED);
    const result = await adapter.execute(verifiedSandboxRequest());

    expect(result.signals[0]?.company).toBe("Acme");
  });

  it("uses coherent sourceCount from attendee metadata", async () => {
    const adapter = adapterForFixture(CALENDAR_SANDBOX_FIXTURE_INTERVIEW_SCHEDULED);
    const result = await adapter.execute(verifiedSandboxRequest());

    expect(result.signals[0]?.sourceCount).toBe(3);
  });

  it("does not expose sandbox scenario in public result", async () => {
    const adapter = adapterForFixture(CALENDAR_SANDBOX_FIXTURE_MULTI_SIGNAL);
    const result = await adapter.execute(verifiedSandboxRequest());
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/"scenario"/);
    expect(serialized).not.toMatch(/companySlug/);
    expect(serialized).not.toMatch(/no_signal/);
  });
});

describe("createCalendarSandboxScenarioProvider", () => {
  it("respects limit", async () => {
    const provider = createCalendarSandboxScenarioProvider(CALENDAR_SANDBOX_FIXTURE_MULTI_SIGNAL);
    const rows = await provider.listSandboxEvents({ limit: 1 });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.metadata.startsAt).toBe("2026-06-26T14:00:00.000Z");
  });

  it("respects from window", async () => {
    const provider = createCalendarSandboxScenarioProvider(CALENDAR_SANDBOX_FIXTURE_MULTI_SIGNAL);
    const rows = await provider.listSandboxEvents({
      from: "2026-06-27T00:00:00.000Z",
      limit: 10,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.scenario).toBe("application_deadline_detected");
  });

  it("respects to window", async () => {
    const provider = createCalendarSandboxScenarioProvider(CALENDAR_SANDBOX_FIXTURE_MULTI_SIGNAL);
    const rows = await provider.listSandboxEvents({
      to: "2026-06-26T15:00:00.000Z",
      limit: 10,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.scenario).toBe("interview_scheduled");
  });

  it("does not mutate the original fixture", async () => {
    const fixture = getCalendarSandboxFixture("calendar-interview-scheduled");
    const originalStartsAt = fixture.events[0]?.metadata.startsAt;
    const provider = createCalendarSandboxScenarioProvider(fixture);
    const rows = await provider.listSandboxEvents({ limit: 5 });

    rows[0]!.metadata.startsAt = "2099-01-01T00:00:00.000Z";
    expect(fixture.events[0]?.metadata.startsAt).toBe(originalStartsAt);
  });
});

describe("createCalendarSandboxMetadataProvider", () => {
  it("returns sanitized metadata without scenario", async () => {
    const provider = createCalendarSandboxMetadataProvider(CALENDAR_SANDBOX_FIXTURE_INTERVIEW_SCHEDULED);
    const rows = await provider.listEventMetadata({ limit: 5 });

    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty("scenario");
    expect(rows[0]?.startsAt).toBe("2026-06-20T14:00:00.000Z");
  });
});

describe("sandbox adapter safety", () => {
  it("returns sanitized error when scenario provider fails", async () => {
    const failingProvider: CalendarSandboxScenarioProvider = {
      listSandboxEvents: async () => {
        throw new Error("provider failure with access_token");
      },
    };
    const adapter = createCalendarReadOnlySandboxAdapter({ fixtureProvider: failingProvider });
    const result = await adapter.execute(verifiedSandboxRequest());

    expect(result.status).toBe("error");
    expect(result.signals).toHaveLength(0);
    expect(result.messages).toContain("Sandbox event metadata processing failed safely.");
    expect(JSON.stringify(result)).not.toMatch(/access_token/);
    expect(isCalendarReadOnlyAdapterResultSafe(result)).toBe(true);
  });

  it("completed result retains no raw data or tokens", async () => {
    const adapter = adapterForFixture(CALENDAR_SANDBOX_FIXTURE_INTERVIEW_SCHEDULED);
    const result = await adapter.execute(verifiedSandboxRequest());
    const serialized = JSON.stringify(result);

    expect(result.importedRawEvents).toBe(false);
    expect(result.retainedRawPayload).toBe(false);
    expect(result.retainedDescriptions).toBe(false);
    expect(result.retainedLocations).toBe(false);
    expect(result.retainedMeetingLinks).toBe(false);
    expect(result.retainedAttendeeAddresses).toBe(false);
    expect(result.hasToken).toBe(false);
    expect(serialized).not.toMatch(/"title"/i);
    expect(serialized).not.toMatch(/"description"/i);
    expect(serialized).not.toMatch(/"location"/i);
    expect(serialized).not.toMatch(/"meetingLink"/i);
    expect(serialized).not.toMatch(/"conferenceUrl"/i);
    expect(serialized).not.toMatch(/attendeeEmail/i);
    expect(serialized).not.toMatch(/organizerEmail/i);
    expect(serialized).not.toMatch(/eventId/i);
    expect(serialized).not.toMatch(/calendarId/i);
    expect(serialized).not.toMatch(/"recurrence"/i);
    expect(serialized).not.toMatch(/access_token/i);
    expect(serialized).not.toMatch(/refresh_token/i);
    expect(serialized).not.toMatch(/client_secret/i);
    expect(serialized).not.toMatch(/"providerPayload"/i);
  });
});

describe("calendar-readonly sandbox boundaries", () => {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const srcDir = join(moduleDir, "../src/calendar-readonly-adapter");
  const sandboxFiles = [
    "sandbox-types.ts",
    "sandbox-fixtures.ts",
    "sandbox-classifier.ts",
    "sandbox-adapter.ts",
  ];

  it("does not import Nango SDK, googleapis, fetch, or process.env", () => {
    const combined = sandboxFiles
      .map((file) => readFileSync(join(srcDir, file), "utf8"))
      .join("\n");

    expect(combined).not.toMatch(/from ['"]@nangohq/);
    expect(combined).not.toMatch(/from ['"]googleapis/);
    expect(combined).not.toMatch(/calendar\.events/);
    expect(combined).not.toMatch(/\bfetch\s*\(/);
    expect(combined).not.toMatch(/process\.env/);
  });

  it("does not use Math.random, randomUUID, or Date.now", () => {
    const combined = sandboxFiles
      .map((file) => readFileSync(join(srcDir, file), "utf8"))
      .join("\n");

    expect(combined).not.toMatch(/Math\.random/);
    expect(combined).not.toMatch(/randomUUID/);
    expect(combined).not.toMatch(/Date\.now/);
  });
});
