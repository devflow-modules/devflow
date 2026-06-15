import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CALENDAR_SANDBOX_FIXTURE_INTERVIEW_SCHEDULED,
  CALENDAR_SANDBOX_FIXTURE_MULTI_SIGNAL,
  createCalendarReadOnlyAdapterRequest,
  createCalendarReadOnlySandboxAdapter,
  createCalendarSandboxScenarioProvider,
  createGmailReadOnlyAdapterRequest,
  createGmailReadOnlySandboxAdapter,
  createGmailSandboxMetadataProvider,
  GMAIL_SANDBOX_FIXTURE_APPLICATION_DETECTED,
  GMAIL_SANDBOX_FIXTURE_MULTI_SIGNAL,
  type CalendarDerivedSignal,
  type GmailDerivedSignal,
  type GmailReadOnlyAdapter,
  type CalendarReadOnlyAdapter,
} from "../src/index.js";
import {
  composeProviderDerivedSignals,
  createEmptyProviderDerivedSignalSummary,
  createFailedProviderDerivedSandboxCompositionResult,
  createProviderDerivedSandboxCompositionResult,
  createProviderDerivedSignalId,
  createSelectedSignalsComposition,
  executeProviderDerivedSandboxComposition,
  normalizeCalendarDerivedSignal,
  normalizeGmailDerivedSignal,
  summarizeProviderDerivedSignals,
} from "../src/provider-derived-signals/index.js";

const requestedAt = "2026-06-15T12:00:00.000Z";

function gmailSignal(overrides?: Partial<GmailDerivedSignal>): GmailDerivedSignal {
  return {
    id:
      createProviderDerivedSignalId({
        source: "gmail",
        kind: "application_detected",
        occurredAt: "2026-06-11T09:00:00.000Z",
        sequence: 1,
      }) ?? "invalid-id",
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
    id:
      createProviderDerivedSignalId({
        source: "calendar",
        kind: "interview_scheduled",
        occurredAt: "2026-06-20T14:00:00.000Z",
        sequence: 1,
      }) ?? "invalid-id",
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

describe("normalizeGmailDerivedSignal", () => {
  it("normalizes GmailDerivedSignal with gmail source", () => {
    const normalized = normalizeGmailDerivedSignal(gmailSignal());

    expect(normalized.source).toBe("gmail");
    expect(normalized.kind).toBe("application_detected");
    expect(normalized.occurredAt).toBe("2026-06-11T09:00:00.000Z");
    expect(normalized.company).toBe("Acme");
    expect(normalized.confidence).toBe(0.85);
    expect(normalized.reviewRequired).toBe(true);
    expect(normalized.sourceCount).toBe(1);
    expect(normalized.startsAt).toBeUndefined();
  });
});

describe("normalizeCalendarDerivedSignal", () => {
  it("normalizes CalendarDerivedSignal with calendar source and startsAt", () => {
    const normalized = normalizeCalendarDerivedSignal(calendarSignal());

    expect(normalized.source).toBe("calendar");
    expect(normalized.kind).toBe("interview_scheduled");
    expect(normalized.startsAt).toBe("2026-06-20T14:00:00.000Z");
    expect(normalized.reviewRequired).toBe(true);
  });
});

describe("composeProviderDerivedSignals", () => {
  it("combines Gmail and Calendar signals without mutating inputs", () => {
    const gmailSignals = [gmailSignal()];
    const calendarSignals = [calendarSignal()];
    const gmailSnapshot = structuredClone(gmailSignals);
    const calendarSnapshot = structuredClone(calendarSignals);

    const composed = composeProviderDerivedSignals({ gmailSignals, calendarSignals });

    expect(gmailSignals).toEqual(gmailSnapshot);
    expect(calendarSignals).toEqual(calendarSnapshot);
    expect(composed).toHaveLength(2);
    expect(composed.map((signal) => signal.source)).toEqual(["gmail", "calendar"]);
  });

  it("sorts deterministically by occurredAt, source, kind, and id", () => {
    const composed = composeProviderDerivedSignals({
      gmailSignals: [
        gmailSignal({
          id: "gmail-b",
          kind: "interview_likely",
          occurredAt: "2026-06-20T14:00:00.000Z",
        }),
        gmailSignal({
          id: "gmail-a",
          kind: "application_detected",
          occurredAt: "2026-06-11T09:00:00.000Z",
        }),
      ],
      calendarSignals: [
        calendarSignal({
          id: "calendar-a",
          kind: "interview_scheduled",
          occurredAt: "2026-06-20T14:00:00.000Z",
        }),
      ],
    });

    expect(composed.map((signal) => `${signal.source}:${signal.id}`)).toEqual([
      "gmail:gmail-a",
      "calendar:calendar-a",
      "gmail:gmail-b",
    ]);
  });

  it("produces identical output for the same input", () => {
    const input = {
      gmailSignals: [gmailSignal(), gmailSignal({ id: "gmail-2", kind: "offer_likely", occurredAt: "2026-06-12T10:00:00.000Z" })],
      calendarSignals: [calendarSignal()],
    };

    expect(composeProviderDerivedSignals(input)).toEqual(composeProviderDerivedSignals(input));
  });

  it("removes exact duplicates within the same source", () => {
    const duplicate = gmailSignal();
    const composed = composeProviderDerivedSignals({
      gmailSignals: [duplicate, { ...duplicate }],
      calendarSignals: [],
    });

    expect(composed).toHaveLength(1);
  });

  it("does not merge distinct Gmail and Calendar signals", () => {
    const composed = composeProviderDerivedSignals({
      gmailSignals: [gmailSignal({ kind: "interview_likely", occurredAt: "2026-06-20T14:00:00.000Z" })],
      calendarSignals: [calendarSignal({ kind: "interview_scheduled", occurredAt: "2026-06-20T14:00:00.000Z" })],
    });

    expect(composed).toHaveLength(2);
    expect(composed.map((signal) => signal.kind).sort()).toEqual([
      "interview_likely",
      "interview_scheduled",
    ]);
  });
});

describe("summarizeProviderDerivedSignals", () => {
  it("returns empty summary when there are no signals", () => {
    expect(summarizeProviderDerivedSignals([])).toEqual(createEmptyProviderDerivedSignalSummary());
  });

  it("computes counts, companies, kinds, and flags", () => {
    const summary = summarizeProviderDerivedSignals(
      composeProviderDerivedSignals({
        gmailSignals: [
          gmailSignal({ kind: "offer_likely", occurredAt: "2026-06-10T08:00:00.000Z", company: "Beta" }),
          gmailSignal({ kind: "rejection_likely", occurredAt: "2026-06-11T09:00:00.000Z", company: "Acme" }),
          gmailSignal({ kind: "follow_up_required", occurredAt: "2026-06-12T10:00:00.000Z", company: "Acme" }),
        ],
        calendarSignals: [
          calendarSignal({
            kind: "interview_scheduled",
            occurredAt: "2026-06-20T14:00:00.000Z",
            company: "Acme",
          }),
        ],
      }),
    );

    expect(summary.totalSignals).toBe(4);
    expect(summary.gmailSignalCount).toBe(3);
    expect(summary.calendarSignalCount).toBe(1);
    expect(summary.reviewRequiredCount).toBe(4);
    expect(summary.companies).toEqual(["Acme", "Beta"]);
    expect(summary.kinds).toEqual([
      "follow_up_required",
      "interview_scheduled",
      "offer_likely",
      "rejection_likely",
    ]);
    expect(summary.hasInterviewSignal).toBe(true);
    expect(summary.hasPendingActionSignal).toBe(true);
    expect(summary.hasOfferSignal).toBe(true);
    expect(summary.hasRejectionSignal).toBe(true);
    expect(summary.latestActivityAt).toBe("2026-06-20T14:00:00.000Z");
  });
});

describe("createProviderDerivedSandboxCompositionResult", () => {
  it("returns completed sandbox result with invariant safety flags", () => {
    const result = createProviderDerivedSandboxCompositionResult({
      gmailSignals: [gmailSignal()],
      calendarSignals: [calendarSignal()],
    });

    expect(result.status).toBe("completed");
    expect(result.runtime).toBe("sandbox");
    expect(result.safeForClient).toBe(true);
    expect(result.deterministic).toBe(true);
    expect(result.importedRawProviderData).toBe(false);
    expect(result.retainedRawPayload).toBe(false);
    expect(result.retainedBodies).toBe(false);
    expect(result.retainedSnippets).toBe(false);
    expect(result.retainedDescriptions).toBe(false);
    expect(result.retainedLocations).toBe(false);
    expect(result.retainedMeetingLinks).toBe(false);
    expect(result.retainedProviderIdentifiers).toBe(false);
    expect(result.hasToken).toBe(false);
    expect(result.userReviewRequired).toBe(true);
    expect(result.signals).toHaveLength(2);
    expect(result.summary.totalSignals).toBe(2);
    expect(result.messages[0]).toMatch(/composed safely/i);
  });

  it("does not expose raw provider fields in JSON", () => {
    const result = createProviderDerivedSandboxCompositionResult({
      gmailSignals: [gmailSignal()],
      calendarSignals: [calendarSignal()],
    });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/"subject"/i);
    expect(serialized).not.toMatch(/"snippet"/i);
    expect(serialized).not.toMatch(/"body"/i);
    expect(serialized).not.toMatch(/"description"/i);
    expect(serialized).not.toMatch(/"location"/i);
    expect(serialized).not.toMatch(/"meetingLink"/i);
    expect(serialized).not.toMatch(/attendeeEmail/i);
    expect(serialized).not.toMatch(/organizerEmail/i);
    expect(serialized).not.toMatch(/messageId/i);
    expect(serialized).not.toMatch(/threadId/i);
    expect(serialized).not.toMatch(/eventId/i);
    expect(serialized).not.toMatch(/calendarId/i);
    expect(serialized).not.toMatch(/access_token/i);
    expect(serialized).not.toMatch(/refresh_token/i);
    expect(serialized).not.toMatch(/client_secret/i);
    expect(serialized).not.toMatch(/"providerPayload"/i);
  });
});

describe("executeProviderDerivedSandboxComposition", () => {
  const gmailRequest = createGmailReadOnlyAdapterRequest({
    runtime: "sandbox",
    connectionVerified: true,
    requestedAt,
  });
  const calendarRequest = createCalendarReadOnlyAdapterRequest({
    runtime: "sandbox",
    connectionVerified: true,
    requestedAt,
  });

  it("composes signals from injected sandbox adapters", async () => {
    const result = await executeProviderDerivedSandboxComposition({
      gmailAdapter: createGmailReadOnlySandboxAdapter({
        metadataProvider: createGmailSandboxMetadataProvider(GMAIL_SANDBOX_FIXTURE_APPLICATION_DETECTED),
      }),
      gmailRequest,
      calendarAdapter: createCalendarReadOnlySandboxAdapter({
        fixtureProvider: createCalendarSandboxScenarioProvider(CALENDAR_SANDBOX_FIXTURE_INTERVIEW_SCHEDULED),
      }),
      calendarRequest,
    });

    expect(result.status).toBe("completed");
    expect(result.signals).toHaveLength(2);
    expect(result.summary.gmailSignalCount).toBe(1);
    expect(result.summary.calendarSignalCount).toBe(1);
  });

  it("returns sanitized error when Gmail adapter fails", async () => {
    const failingGmailAdapter: GmailReadOnlyAdapter = {
      execute: async () => {
        throw new Error("gmail failure with access_token");
      },
    };
    const result = await executeProviderDerivedSandboxComposition({
      gmailAdapter: failingGmailAdapter,
      gmailRequest,
      calendarAdapter: createCalendarReadOnlySandboxAdapter({
        fixtureProvider: createCalendarSandboxScenarioProvider(CALENDAR_SANDBOX_FIXTURE_INTERVIEW_SCHEDULED),
      }),
      calendarRequest,
    });

    expect(result.status).toBe("error");
    expect(result.signals).toHaveLength(0);
    expect(result.summary.totalSignals).toBe(0);
    expect(result.messages).toContain("Sandbox provider-derived signal composition failed safely.");
    expect(JSON.stringify(result)).not.toMatch(/access_token/);
  });

  it("returns sanitized error when Calendar adapter fails", async () => {
    const failingCalendarAdapter: CalendarReadOnlyAdapter = {
      execute: async () => ({
        provider: "calendar",
        runtime: "sandbox",
        status: "error",
        safeForClient: true,
        readOnly: true,
        connectionVerified: true,
        importedRawEvents: false,
        retainedRawPayload: false,
        retainedDescriptions: false,
        retainedLocations: false,
        retainedMeetingLinks: false,
        retainedAttendeeAddresses: false,
        hasToken: false,
        userReviewRequired: true,
        signals: [],
        warnings: ["sandbox_event_metadata_processing_failed"],
        messages: ["Sandbox event metadata processing failed safely."],
        processedEventCount: 0,
      }),
    };

    const result = await executeProviderDerivedSandboxComposition({
      gmailAdapter: createGmailReadOnlySandboxAdapter({
        metadataProvider: createGmailSandboxMetadataProvider(GMAIL_SANDBOX_FIXTURE_APPLICATION_DETECTED),
      }),
      gmailRequest,
      calendarAdapter: failingCalendarAdapter,
      calendarRequest,
    });

    expect(result.status).toBe("error");
    expect(result.signals).toHaveLength(0);
    expect(result.summary).toEqual(createEmptyProviderDerivedSignalSummary());
  });

  it("does not return partial results on adapter error", async () => {
    const result = createFailedProviderDerivedSandboxCompositionResult();

    expect(result.signals).toHaveLength(0);
    expect(result.summary.totalSignals).toBe(0);
  });

  it("composes multi-signal fixtures deterministically end-to-end", async () => {
    const result = await executeProviderDerivedSandboxComposition({
      gmailAdapter: createGmailReadOnlySandboxAdapter({
        metadataProvider: createGmailSandboxMetadataProvider(GMAIL_SANDBOX_FIXTURE_MULTI_SIGNAL),
      }),
      gmailRequest,
      calendarAdapter: createCalendarReadOnlySandboxAdapter({
        fixtureProvider: createCalendarSandboxScenarioProvider(CALENDAR_SANDBOX_FIXTURE_MULTI_SIGNAL),
      }),
      calendarRequest,
    });

    const second = await executeProviderDerivedSandboxComposition({
      gmailAdapter: createGmailReadOnlySandboxAdapter({
        metadataProvider: createGmailSandboxMetadataProvider(GMAIL_SANDBOX_FIXTURE_MULTI_SIGNAL),
      }),
      gmailRequest,
      calendarAdapter: createCalendarReadOnlySandboxAdapter({
        fixtureProvider: createCalendarSandboxScenarioProvider(CALENDAR_SANDBOX_FIXTURE_MULTI_SIGNAL),
      }),
      calendarRequest,
    });

    expect(result.status).toBe("completed");
    expect(result).toEqual(second);
    expect(result.signals.length).toBeGreaterThan(2);
    expect(result.signals.some((signal) => signal.source === "gmail" && signal.kind === "interview_likely")).toBe(true);
    expect(result.signals.some((signal) => signal.source === "calendar" && signal.kind === "interview_scheduled")).toBe(true);
    expect(result.signals.every((signal) => signal.id.startsWith("provider-signal-"))).toBe(true);
    expect(result.signals.every((signal) => !signal.id.includes("-sandbox-"))).toBe(true);
  });
});

describe("provider-derived sandbox boundaries", () => {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const srcDir = join(moduleDir, "../src/provider-derived-signals");
  const moduleFiles = [
    "types.ts",
    "normalization.ts",
    "composition.ts",
    "summary.ts",
    "sandbox-composition.ts",
    "signal-id.ts",
    "index.ts",
  ];

  it("does not import Nango SDK, googleapis, fetch, or process.env", () => {
    const combined = moduleFiles
      .map((file) => readFileSync(join(srcDir, file), "utf8"))
      .join("\n");

    expect(combined).not.toMatch(/from ['"]@nangohq/);
    expect(combined).not.toMatch(/from ['"]googleapis/);
    expect(combined).not.toMatch(/gmail\.users/);
    expect(combined).not.toMatch(/calendar\.events/);
    expect(combined).not.toMatch(/\bfetch\s*\(/);
    expect(combined).not.toMatch(/process\.env/);
  });

  it("does not use Math.random, randomUUID, or Date.now", () => {
    const combined = moduleFiles
      .map((file) => readFileSync(join(srcDir, file), "utf8"))
      .join("\n");

    expect(combined).not.toMatch(/Math\.random/);
    expect(combined).not.toMatch(/randomUUID/);
    expect(combined).not.toMatch(/Date\.now/);
  });
});

describe("confidence and review invariants", () => {
  it("preserves confidence between 0 and 1", () => {
    const composed = composeProviderDerivedSignals({
      gmailSignals: [
        gmailSignal({ confidence: 0.75 }),
        gmailSignal({ id: "gmail-2", kind: "offer_likely", confidence: 0.9, occurredAt: "2026-06-12T10:00:00.000Z" }),
      ],
      calendarSignals: [calendarSignal({ confidence: 0.85 })],
    });

    for (const signal of composed) {
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(1);
      expect(signal.reviewRequired).toBe(true);
    }
  });
});

describe("tie-break ordering", () => {
  it("breaks ties by source when occurredAt matches", () => {
    const composed = composeProviderDerivedSignals({
      gmailSignals: [gmailSignal({ id: "gmail-tie", occurredAt: "2026-06-20T14:00:00.000Z", kind: "interview_likely" })],
      calendarSignals: [calendarSignal({ id: "calendar-tie", occurredAt: "2026-06-20T14:00:00.000Z" })],
    });

    expect(composed[0]?.source).toBe("calendar");
    expect(composed[1]?.source).toBe("gmail");
  });

  it("breaks ties by kind when occurredAt and source match within composed set", () => {
    const composed = composeProviderDerivedSignals({
      gmailSignals: [
        gmailSignal({ id: "gmail-z", kind: "offer_likely", occurredAt: "2026-06-20T14:00:00.000Z" }),
        gmailSignal({ id: "gmail-a", kind: "application_detected", occurredAt: "2026-06-20T14:00:00.000Z" }),
      ],
      calendarSignals: [],
    });

    expect(composed.map((signal) => signal.kind)).toEqual(["application_detected", "offer_likely"]);
  });

  it("breaks ties by id when occurredAt, source, and kind match", () => {
    const composed = composeProviderDerivedSignals({
      gmailSignals: [],
      calendarSignals: [
        calendarSignal({ id: "calendar-z", kind: "recruiter_call_likely", occurredAt: "2026-06-20T14:00:00.000Z" }),
        calendarSignal({ id: "calendar-a", kind: "recruiter_call_likely", occurredAt: "2026-06-20T14:00:00.000Z" }),
      ],
    });

    expect(composed.map((signal) => signal.id)).toEqual(["calendar-a", "calendar-z"]);
  });
});

describe("summary flags", () => {
  it("detects interview and pending action signals separately", () => {
    const interviewSummary = summarizeProviderDerivedSignals([
      normalizeGmailDerivedSignal(
        gmailSignal({ kind: "interview_likely", occurredAt: "2026-06-20T14:00:00.000Z" }),
      ),
    ]);
    const pendingSummary = summarizeProviderDerivedSignals([
      normalizeCalendarDerivedSignal(
        calendarSignal({ kind: "application_deadline_detected", occurredAt: "2026-06-25T00:00:00.000Z" }),
      ),
    ]);

    expect(interviewSummary.hasInterviewSignal).toBe(true);
    expect(interviewSummary.hasPendingActionSignal).toBe(false);
    expect(pendingSummary.hasInterviewSignal).toBe(false);
    expect(pendingSummary.hasPendingActionSignal).toBe(true);
  });
});

describe("createSelectedSignalsComposition", () => {
  it("builds completed composition from selected provider signals with recalculated summary", () => {
    const signals = composeProviderDerivedSignals({
      gmailSignals: [gmailSignal({ company: "Acme" })],
      calendarSignals: [calendarSignal({ company: "Beta" })],
    });
    const selected = createSelectedSignalsComposition([signals[1]!]);

    expect(selected.status).toBe("completed");
    expect(selected.runtime).toBe("sandbox");
    expect(selected.signals).toHaveLength(1);
    expect(selected.summary.totalSignals).toBe(1);
    expect(selected.summary.calendarSignalCount).toBe(1);
    expect(selected.summary.gmailSignalCount).toBe(0);
    expect(selected.summary.companies).toEqual(["Beta"]);
  });
});
