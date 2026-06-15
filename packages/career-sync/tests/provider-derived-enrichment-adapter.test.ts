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
  createProviderDerivedSandboxCompositionResult,
  createProviderDerivedSignalId,
  executeProviderDerivedSandboxComposition,
  GMAIL_SANDBOX_FIXTURE_APPLICATION_DETECTED,
  GMAIL_SANDBOX_FIXTURE_INTERVIEW_LIKELY,
  GMAIL_SANDBOX_FIXTURE_MULTI_SIGNAL,
  GMAIL_SANDBOX_FIXTURE_OFFER_LIKELY,
  GMAIL_SANDBOX_FIXTURE_REJECTION_LIKELY,
  type ProviderDerivedSignal,
} from "../src/index.js";
import {
  adaptProviderDerivedSignalsToSyncEnrichment,
} from "../src/provider-derived-enrichment/adapter.js";
import {
  mapProviderDerivedSignalToCareerSyncSignal,
  validateAdaptedCareerBundleSyncEnrichment,
} from "../src/provider-derived-enrichment/index.js";
import { createFailedProviderDerivedSandboxCompositionResult } from "../src/provider-derived-signals/sandbox-composition.js";

const requestedAt = "2026-06-15T12:00:00.000Z";
const generatedAt = "2026-06-15T12:00:00.000Z";

function providerSignal(overrides: Partial<ProviderDerivedSignal> & Pick<ProviderDerivedSignal, "id" | "source" | "kind" | "occurredAt">): ProviderDerivedSignal {
  return {
    confidence: 0.85,
    reviewRequired: true,
    sourceCount: 1,
    ...overrides,
  };
}

describe("mapProviderDerivedSignalToCareerSyncSignal", () => {
  it("maps Gmail source with receivedAt and without eventAt", () => {
    const mapped = mapProviderDerivedSignalToCareerSyncSignal(
      providerSignal({
        id:
          createProviderDerivedSignalId({
            source: "gmail",
            kind: "interview_likely",
            occurredAt: "2026-06-20T14:00:00.000Z",
            sequence: 1,
          }) ?? "invalid-id",
        source: "gmail",
        kind: "interview_likely",
        occurredAt: "2026-06-20T14:00:00.000Z",
        company: "Acme",
        confidence: 0.8,
      }),
    );

    expect(mapped.source).toBe("gmail");
    expect(mapped.receivedAt).toBe("2026-06-20T14:00:00.000Z");
    expect(mapped.eventAt).toBeUndefined();
    expect(mapped.companyHint).toBe("Acme");
    expect(mapped.rawRetained).toBe(false);
    expect(mapped.providerId).toBeUndefined();
  });

  it("maps Calendar interview scheduled with eventAt from startsAt", () => {
    const mapped = mapProviderDerivedSignalToCareerSyncSignal(
      providerSignal({
        id:
          createProviderDerivedSignalId({
            source: "calendar",
            kind: "interview_scheduled",
            occurredAt: "2026-06-20T14:00:00.000Z",
            sequence: 1,
          }) ?? "invalid-id",
        source: "calendar",
        kind: "interview_scheduled",
        occurredAt: "2026-06-20T14:00:00.000Z",
        startsAt: "2026-06-20T14:00:00.000Z",
        company: "Beta",
      }),
    );

    expect(mapped.source).toBe("calendar");
    expect(mapped.eventAt).toBe("2026-06-20T14:00:00.000Z");
    expect(mapped.processStage).toBe("interview");
  });

  it("keeps offer likely and rejection likely non-authoritative in safeSummary", () => {
    const offer = mapProviderDerivedSignalToCareerSyncSignal(
      providerSignal({
        id: "gmail-offer",
        source: "gmail",
        kind: "offer_likely",
        occurredAt: "2026-06-10T08:00:00.000Z",
      }),
    );
    const rejection = mapProviderDerivedSignalToCareerSyncSignal(
      providerSignal({
        id: "gmail-rejection",
        source: "gmail",
        kind: "rejection_likely",
        occurredAt: "2026-06-11T09:00:00.000Z",
      }),
    );

    expect(offer.safeSummary).toMatch(/offer likely/i);
    expect(rejection.safeSummary).toMatch(/rejection likely/i);
    expect(offer.processStage).toBe("offer");
    expect(rejection.processStage).toBe("rejected");
  });

  it("marks pending action kinds as actionRequired", () => {
    const mapped = mapProviderDerivedSignalToCareerSyncSignal(
      providerSignal({
        id: "gmail-follow-up",
        source: "gmail",
        kind: "follow_up_required",
        occurredAt: "2026-06-12T10:00:00.000Z",
      }),
    );

    expect(mapped.actionRequired).toBe(true);
  });
});

describe("adaptProviderDerivedSignalsToSyncEnrichment", () => {
  it("produces enrichment when composition is completed", () => {
    const composition = createProviderDerivedSandboxCompositionResult({
      gmailSignals: [
        {
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
        },
      ],
      calendarSignals: [
        {
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
          company: "Beta",
          confidence: 0.9,
          reviewRequired: true,
          sourceCount: 3,
        },
      ],
    });

    const result = adaptProviderDerivedSignalsToSyncEnrichment({ composition, generatedAt });

    expect(result.status).toBe("completed");
    expect(result.safeForClient).toBe(true);
    expect(result.deterministic).toBe(true);
    expect(result.userReviewRequired).toBe(true);
    expect(result.sourceSignalCount).toBe(2);
    expect(result.enrichment?.source).toBe("sync");
    expect(result.enrichment?.combinedSignals).toHaveLength(2);
    expect(result.enrichment?.generatedAt).toBe(generatedAt);
  });

  it("blocks when composition status is error", () => {
    const composition = createFailedProviderDerivedSandboxCompositionResult();
    const result = adaptProviderDerivedSignalsToSyncEnrichment({ composition, generatedAt });

    expect(result.status).toBe("blocked");
    expect(result.enrichment).toBeUndefined();
    expect(result.warnings).toContain("composition_not_completed");
  });

  it("preserves source counts and companies from composition summary", () => {
    const composition = createProviderDerivedSandboxCompositionResult({
      gmailSignals: [
        {
          id: "gmail-1",
          kind: "follow_up_required",
          provider: "gmail",
          occurredAt: "2026-06-12T10:00:00.000Z",
          company: "Beta",
          confidence: 0.75,
          reviewRequired: true,
          sourceCount: 1,
        },
        {
          id: "gmail-2",
          kind: "offer_likely",
          provider: "gmail",
          occurredAt: "2026-06-10T08:00:00.000Z",
          company: "Acme",
          confidence: 0.8,
          reviewRequired: true,
          sourceCount: 1,
        },
      ],
      calendarSignals: [
        {
          id: "calendar-1",
          kind: "application_deadline_detected",
          provider: "calendar",
          occurredAt: "2026-06-25T00:00:00.000Z",
          startsAt: "2026-06-25T00:00:00.000Z",
          company: "Acme",
          confidence: 0.85,
          reviewRequired: true,
          sourceCount: 1,
        },
      ],
    });

    const result = adaptProviderDerivedSignalsToSyncEnrichment({ composition, generatedAt });

    expect(result.enrichment?.stats.sourceCounts).toEqual({ gmail: 2, calendar: 1 });
    expect(result.enrichment?.stats.totalSignals).toBe(3);
    expect(result.enrichment?.stats.companyHints).toEqual(["Acme", "Beta"]);
    expect(result.enrichment?.stats.actionRequiredCount).toBe(2);
  });

  it("does not promote interview likely to scheduled event", () => {
    const composition = createProviderDerivedSandboxCompositionResult({
      gmailSignals: [
        {
          id: "gmail-interview-likely",
          kind: "interview_likely",
          provider: "gmail",
          occurredAt: "2026-06-20T14:00:00.000Z",
          confidence: 0.8,
          reviewRequired: true,
          sourceCount: 1,
        },
      ],
      calendarSignals: [
        {
          id: "calendar-interview-scheduled",
          kind: "interview_scheduled",
          provider: "calendar",
          occurredAt: "2026-06-20T14:00:00.000Z",
          startsAt: "2026-06-20T14:00:00.000Z",
          confidence: 0.9,
          reviewRequired: true,
          sourceCount: 2,
        },
      ],
    });

    const result = adaptProviderDerivedSignalsToSyncEnrichment({ composition, generatedAt });
    const gmailSignal = result.enrichment?.combinedSignals.find((signal) => signal.source === "gmail");
    const calendarSignal = result.enrichment?.combinedSignals.find((signal) => signal.source === "calendar");

    expect(gmailSignal?.eventAt).toBeUndefined();
    expect(calendarSignal?.eventAt).toBe("2026-06-20T14:00:00.000Z");
    expect(result.enrichment?.combinedSignals).toHaveLength(2);
  });

  it("does not mutate composition input", () => {
    const composition = createProviderDerivedSandboxCompositionResult({
      gmailSignals: [
        {
          id: "gmail-1",
          kind: "application_detected",
          provider: "gmail",
          occurredAt: "2026-06-11T09:00:00.000Z",
          confidence: 0.85,
          reviewRequired: true,
          sourceCount: 1,
        },
      ],
      calendarSignals: [],
    });
    const snapshot = structuredClone(composition);

    adaptProviderDerivedSignalsToSyncEnrichment({ composition, generatedAt });

    expect(composition).toEqual(snapshot);
  });

  it("is deterministic for the same input and generatedAt", () => {
    const composition = createProviderDerivedSandboxCompositionResult({
      gmailSignals: [
        {
          id: "gmail-1",
          kind: "recruiter_response_detected",
          provider: "gmail",
          occurredAt: "2026-06-11T09:00:00.000Z",
          confidence: 0.85,
          reviewRequired: true,
          sourceCount: 1,
        },
      ],
      calendarSignals: [],
    });

    const first = adaptProviderDerivedSignalsToSyncEnrichment({ composition, generatedAt });
    const second = adaptProviderDerivedSignalsToSyncEnrichment({ composition, generatedAt });

    expect(first).toEqual(second);
  });

  it("keeps privacy flags safe with zero retention", () => {
    const composition = createProviderDerivedSandboxCompositionResult({
      gmailSignals: [
        {
          id: "gmail-1",
          kind: "application_detected",
          provider: "gmail",
          occurredAt: "2026-06-11T09:00:00.000Z",
          confidence: 0.85,
          reviewRequired: true,
          sourceCount: 1,
        },
      ],
      calendarSignals: [],
    });

    const result = adaptProviderDerivedSignalsToSyncEnrichment({ composition, generatedAt });

    expect(result.enrichment?.privacy).toEqual({
      rawRetained: false,
      redacted: true,
      meetingLinksRemoved: true,
      providerPayloadRetained: false,
      userReviewRequired: true,
    });
  });

  it("passes adapted enrichment validation", () => {
    const composition = createProviderDerivedSandboxCompositionResult({
      gmailSignals: [
        {
          id: "gmail-1",
          kind: "application_detected",
          provider: "gmail",
          occurredAt: "2026-06-11T09:00:00.000Z",
          confidence: 0.85,
          reviewRequired: true,
          sourceCount: 1,
        },
      ],
      calendarSignals: [],
    });
    const result = adaptProviderDerivedSignalsToSyncEnrichment({ composition, generatedAt });

    expect(validateAdaptedCareerBundleSyncEnrichment(result.enrichment!, composition.summary).valid).toBe(true);
  });

  it("returns sanitized error when validation fails", () => {
    const composition = createProviderDerivedSandboxCompositionResult({
      gmailSignals: [
        {
          id: "gmail-1",
          kind: "application_detected",
          provider: "gmail",
          occurredAt: "2026-06-11T09:00:00.000Z",
          confidence: 0.85,
          reviewRequired: true,
          sourceCount: 1,
        },
      ],
      calendarSignals: [],
    });

    const mismatchedComposition = {
      ...composition,
      summary: {
        ...composition.summary,
        totalSignals: 99,
      },
    };

    const result = adaptProviderDerivedSignalsToSyncEnrichment({
      composition: mismatchedComposition,
      generatedAt,
    });

    expect(result.status).toBe("error");
    expect(result.enrichment).toBeUndefined();
    expect(result.messages).toContain("Provider-derived enrichment adaptation failed safely.");
    expect(result.messages.join(" ")).not.toMatch(/stats\.totalSignals/);
    expect(result.warnings).toContain("adapted_sync_enrichment_validation_failed");
  });

  it("does not expose forbidden raw data in JSON", () => {
    const composition = createProviderDerivedSandboxCompositionResult({
      gmailSignals: [
        {
          id:
            createProviderDerivedSignalId({
              source: "gmail",
              kind: "offer_likely",
              occurredAt: "2026-06-10T08:00:00.000Z",
              sequence: 1,
            }) ?? "invalid-id",
          kind: "offer_likely",
          provider: "gmail",
          occurredAt: "2026-06-10T08:00:00.000Z",
          company: "Acme",
          confidence: 0.8,
          reviewRequired: true,
          sourceCount: 1,
        },
      ],
      calendarSignals: [
        {
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
          confidence: 0.9,
          reviewRequired: true,
          sourceCount: 2,
        },
      ],
    });

    const result = adaptProviderDerivedSignalsToSyncEnrichment({ composition, generatedAt });
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
    expect(serialized).not.toMatch(/connectionId/i);
    expect(serialized).not.toMatch(/sessionToken/i);
    expect(serialized).not.toMatch(/access_token/i);
    expect(serialized).not.toMatch(/refresh_token/i);
    expect(serialized).not.toMatch(/client_secret/i);
    expect(serialized).not.toMatch(/"providerPayload"/i);
  });
});

describe("adaptProviderDerivedSignalsToSyncEnrichment end-to-end", () => {
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

  it("adapts composed sandbox signals from injected adapters", async () => {
    const composition = await executeProviderDerivedSandboxComposition({
      gmailAdapter: createGmailReadOnlySandboxAdapter({
        metadataProvider: createGmailSandboxMetadataProvider(GMAIL_SANDBOX_FIXTURE_MULTI_SIGNAL),
      }),
      gmailRequest,
      calendarAdapter: createCalendarReadOnlySandboxAdapter({
        fixtureProvider: createCalendarSandboxScenarioProvider(CALENDAR_SANDBOX_FIXTURE_MULTI_SIGNAL),
      }),
      calendarRequest,
    });

    const result = adaptProviderDerivedSignalsToSyncEnrichment({ composition, generatedAt });

    expect(result.status).toBe("completed");
    expect(result.enrichment?.combinedSignals.length).toBeGreaterThan(1);
    expect(result.enrichment?.stats.sourceCounts.gmail).toBeGreaterThan(0);
  });

  it("returns blocked result without partial enrichment when composition fails", async () => {
    const composition = createFailedProviderDerivedSandboxCompositionResult();
    const result = adaptProviderDerivedSignalsToSyncEnrichment({ composition, generatedAt });

    expect(result.status).toBe("blocked");
    expect(result.enrichment).toBeUndefined();
  });
});

describe("validateAdaptedCareerBundleSyncEnrichment", () => {
  it("rejects enrichment with provider identifiers in signals", () => {
    const composition = createProviderDerivedSandboxCompositionResult({
      gmailSignals: [
        {
          id: "gmail-1",
          kind: "application_detected",
          provider: "gmail",
          occurredAt: "2026-06-11T09:00:00.000Z",
          confidence: 0.85,
          reviewRequired: true,
          sourceCount: 1,
        },
      ],
      calendarSignals: [],
    });
    const adapted = adaptProviderDerivedSignalsToSyncEnrichment({ composition, generatedAt });
    const enrichment = adapted.enrichment!;
    enrichment.combinedSignals[0]!.providerId = "provider-message-id";

    const validation = validateAdaptedCareerBundleSyncEnrichment(enrichment);

    expect(validation.valid).toBe(false);
  });
});

describe("provider-derived enrichment boundaries", () => {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const srcDir = join(moduleDir, "../src/provider-derived-enrichment");
  const moduleFiles = ["types.ts", "mapping.ts", "adapter.ts", "index.ts"];

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

describe("fixture-driven adapter scenarios", () => {
  it("handles offer and rejection likely fixtures", async () => {
    const composition = await executeProviderDerivedSandboxComposition({
      gmailAdapter: createGmailReadOnlySandboxAdapter({
        metadataProvider: createGmailSandboxMetadataProvider(GMAIL_SANDBOX_FIXTURE_OFFER_LIKELY),
      }),
      gmailRequest: createGmailReadOnlyAdapterRequest({
        runtime: "sandbox",
        connectionVerified: true,
        requestedAt,
      }),
      calendarAdapter: createCalendarReadOnlySandboxAdapter({
        fixtureProvider: createCalendarSandboxScenarioProvider(CALENDAR_SANDBOX_FIXTURE_INTERVIEW_SCHEDULED),
      }),
      calendarRequest: createCalendarReadOnlyAdapterRequest({
        runtime: "sandbox",
        connectionVerified: true,
        requestedAt,
      }),
    });

    const result = adaptProviderDerivedSignalsToSyncEnrichment({ composition, generatedAt });
    const summaries = result.enrichment?.combinedSignals.map((signal) => signal.safeSummary) ?? [];

    expect(summaries.some((summary) => /offer likely/i.test(summary))).toBe(true);
  });

  it("handles rejection likely fixture", async () => {
    const composition = await executeProviderDerivedSandboxComposition({
      gmailAdapter: createGmailReadOnlySandboxAdapter({
        metadataProvider: createGmailSandboxMetadataProvider(GMAIL_SANDBOX_FIXTURE_REJECTION_LIKELY),
      }),
      gmailRequest: createGmailReadOnlyAdapterRequest({
        runtime: "sandbox",
        connectionVerified: true,
        requestedAt,
      }),
      calendarAdapter: createCalendarReadOnlySandboxAdapter({
        fixtureProvider: createCalendarSandboxScenarioProvider(CALENDAR_SANDBOX_FIXTURE_INTERVIEW_SCHEDULED),
      }),
      calendarRequest: createCalendarReadOnlyAdapterRequest({
        runtime: "sandbox",
        connectionVerified: true,
        requestedAt,
      }),
    });

    const result = adaptProviderDerivedSignalsToSyncEnrichment({ composition, generatedAt });
    const rejection = result.enrichment?.combinedSignals.find((signal) => signal.processStage === "rejected");

    expect(rejection?.safeSummary).toMatch(/rejection likely/i);
  });

  it("keeps interview likely separate from calendar scheduled fixture", async () => {
    const composition = await executeProviderDerivedSandboxComposition({
      gmailAdapter: createGmailReadOnlySandboxAdapter({
        metadataProvider: createGmailSandboxMetadataProvider(GMAIL_SANDBOX_FIXTURE_INTERVIEW_LIKELY),
      }),
      gmailRequest: createGmailReadOnlyAdapterRequest({
        runtime: "sandbox",
        connectionVerified: true,
        requestedAt,
      }),
      calendarAdapter: createCalendarReadOnlySandboxAdapter({
        fixtureProvider: createCalendarSandboxScenarioProvider(CALENDAR_SANDBOX_FIXTURE_INTERVIEW_SCHEDULED),
      }),
      calendarRequest: createCalendarReadOnlyAdapterRequest({
        runtime: "sandbox",
        connectionVerified: true,
        requestedAt,
      }),
    });

    const result = adaptProviderDerivedSignalsToSyncEnrichment({ composition, generatedAt });
    const gmail = result.enrichment?.combinedSignals.find((signal) => signal.source === "gmail");
    const calendar = result.enrichment?.combinedSignals.find((signal) => signal.source === "calendar");

    expect(gmail?.safeSummary).toMatch(/interview likely/i);
    expect(gmail?.eventAt).toBeUndefined();
    expect(calendar?.safeSummary).toMatch(/interview scheduled/i);
    expect(calendar?.eventAt).toBeDefined();
  });
});
