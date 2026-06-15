import { describe, expect, it } from "vitest";
import {
  buildCareerBundleCalendarEnrichment,
  buildCareerBundleGmailEnrichment,
  buildCareerBundleSyncEnrichment,
  buildCalendarSyncPreview,
  buildGmailSyncPreview,
  createProviderDerivedSandboxCompositionResult,
  adaptProviderDerivedSignalsToSyncEnrichment,
  sampleInterviewCalendarEvent,
  sampleInterviewInviteEmail,
  sampleRecruiterEmail,
  sampleTechnicalCalendarEvent,
  validateAdaptedCareerBundleSyncEnrichment,
  validateCareerBundleUnifiedSyncEnrichment,
  type CareerBundleUnifiedSyncEnrichment,
} from "../src/index.js";

const FIXED_NOW = "2026-06-09T12:00:00.000Z";
const FIXED_GENERATED_AT = "2026-06-09T12:00:00.000Z";

function buildSafeSyncEnrichment(): CareerBundleUnifiedSyncEnrichment {
  const gmailPreview = buildGmailSyncPreview({
    messages: [sampleRecruiterEmail, sampleInterviewInviteEmail],
  });
  const calendarPreview = buildCalendarSyncPreview(
    { events: [sampleInterviewCalendarEvent, sampleTechnicalCalendarEvent] },
    { now: FIXED_NOW },
  );
  const gmail = buildCareerBundleGmailEnrichment(gmailPreview.signals, {
    generatedAt: FIXED_GENERATED_AT,
  });
  const calendar = buildCareerBundleCalendarEnrichment(calendarPreview.signals, {
    generatedAt: FIXED_GENERATED_AT,
  });
  return buildCareerBundleSyncEnrichment(
    { gmail, calendar },
    { now: FIXED_NOW, generatedAt: FIXED_GENERATED_AT },
  );
}

function withPrivacyOverride(
  enrichment: CareerBundleUnifiedSyncEnrichment,
  privacy: Partial<CareerBundleUnifiedSyncEnrichment["privacy"]>,
): CareerBundleUnifiedSyncEnrichment {
  return {
    ...enrichment,
    privacy: {
      ...enrichment.privacy,
      ...privacy,
    },
  };
}

describe("validateCareerBundleUnifiedSyncEnrichment", () => {
  it("accepts a complete safe enrichment", () => {
    const enrichment = buildSafeSyncEnrichment();
    const result = validateCareerBundleUnifiedSyncEnrichment(enrichment);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.value).toBe(enrichment);
      expect(result.errors).toEqual([]);
    }
  });

  it("accepts a minimal structurally valid enrichment", () => {
    const enrichment = buildSafeSyncEnrichment();
    const minimal = {
      source: "sync" as const,
      combinedSignals: enrichment.combinedSignals.slice(0, 1),
      summary: enrichment.summary,
      stats: {
        ...enrichment.stats,
        totalSignals: 1,
        actionRequiredCount: 0,
        upcomingCount: 0,
        sourceCounts: { gmail: 1, calendar: 0 },
        companyHints: [],
      },
      generatedAt: enrichment.generatedAt,
      privacy: enrichment.privacy,
    };

    expect(validateCareerBundleUnifiedSyncEnrichment(minimal).valid).toBe(true);
  });

  it("rejects null, array, and string roots", () => {
    expect(validateCareerBundleUnifiedSyncEnrichment(null).valid).toBe(false);
    expect(validateCareerBundleUnifiedSyncEnrichment([]).valid).toBe(false);
    expect(validateCareerBundleUnifiedSyncEnrichment("sync").valid).toBe(false);
  });

  it("rejects missing required fields and invalid types", () => {
    const enrichment = buildSafeSyncEnrichment();
    const { summary: _summary, ...withoutSummary } = enrichment;

    expect(validateCareerBundleUnifiedSyncEnrichment(withoutSummary).valid).toBe(false);
    expect(
      validateCareerBundleUnifiedSyncEnrichment({ ...enrichment, source: "gmail" }).valid,
    ).toBe(false);
  });

  it("rejects invalid generatedAt and impossible timestamps", () => {
    const enrichment = buildSafeSyncEnrichment();

    expect(
      validateCareerBundleUnifiedSyncEnrichment({ ...enrichment, generatedAt: "invalid" }).valid,
    ).toBe(false);
    expect(
      validateCareerBundleUnifiedSyncEnrichment({ ...enrichment, generatedAt: "" }).valid,
    ).toBe(false);
  });

  it("rejects negative and decimal counts", () => {
    const enrichment = buildSafeSyncEnrichment();

    expect(
      validateCareerBundleUnifiedSyncEnrichment({
        ...enrichment,
        stats: { ...enrichment.stats, totalSignals: -1 },
      }).valid,
    ).toBe(false);
    expect(
      validateCareerBundleUnifiedSyncEnrichment({
        ...enrichment,
        stats: { ...enrichment.stats, actionRequiredCount: 1.5 },
      }).valid,
    ).toBe(false);
  });

  it("rejects invalid combined signal source, confidence, and kind-like stage", () => {
    const enrichment = buildSafeSyncEnrichment();
    const invalidSignal = {
      ...enrichment.combinedSignals[0]!,
      source: "nango" as "gmail",
      confidence: "extreme" as "high",
      processStage: "invalid-stage" as "interview",
    };

    const result = validateCareerBundleUnifiedSyncEnrichment({
      ...enrichment,
      combinedSignals: [invalidSignal],
    });

    expect(result.valid).toBe(false);
  });

  it("rejects unsafe privacy flags", () => {
    const enrichment = buildSafeSyncEnrichment();

    expect(
      validateCareerBundleUnifiedSyncEnrichment(
        withPrivacyOverride(enrichment, { rawRetained: true }),
      ).valid,
    ).toBe(false);
    expect(
      validateCareerBundleUnifiedSyncEnrichment(
        withPrivacyOverride(enrichment, { providerPayloadRetained: true }),
      ).valid,
    ).toBe(false);
    expect(
      validateCareerBundleUnifiedSyncEnrichment(
        withPrivacyOverride(enrichment, { meetingLinksRemoved: false }),
      ).valid,
    ).toBe(false);
  });

  it("rejects provider identifiers when rejectProviderIdentifiers is enabled", () => {
    const enrichment = buildSafeSyncEnrichment();
    enrichment.combinedSignals[0]!.providerId = "provider-message-id";

    expect(
      validateCareerBundleUnifiedSyncEnrichment(enrichment, {
        rejectProviderIdentifiers: true,
      }).valid,
    ).toBe(false);
  });

  it("allows legacy demo enrichments that retain optional provider identifiers by default", () => {
    const enrichment = buildSafeSyncEnrichment();

    expect(validateCareerBundleUnifiedSyncEnrichment(enrichment).valid).toBe(true);
  });

  it("rejects forbidden root keys", () => {
    const enrichment = {
      ...buildSafeSyncEnrichment(),
      access_token: "secret",
    };

    expect(validateCareerBundleUnifiedSyncEnrichment(enrichment).valid).toBe(false);
  });

  it("returns warnings without failing for non-critical privacy drift", () => {
    const enrichment = withPrivacyOverride(buildSafeSyncEnrichment(), {
      userReviewRequired: false,
      redacted: false,
    });
    const result = validateCareerBundleUnifiedSyncEnrichment(enrichment);

    expect(result.valid).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("userReviewRequired"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("redacted"))).toBe(true);
  });

  it("does not mutate input and is deterministic", () => {
    const enrichment = buildSafeSyncEnrichment();
    const snapshot = structuredClone(enrichment);

    const first = validateCareerBundleUnifiedSyncEnrichment(enrichment);
    const second = validateCareerBundleUnifiedSyncEnrichment(enrichment);

    expect(enrichment).toEqual(snapshot);
    expect(first).toEqual(second);
  });

  it("returns stable client-safe errors without raw payload", () => {
    const result = validateCareerBundleUnifiedSyncEnrichment({ source: "sync" });

    expect(result.valid).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/access_token|providerPayload|stack/i);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("validateAdaptedCareerBundleSyncEnrichment compatibility", () => {
  it("returns equivalent validity for provider-derived enrichment", () => {
    const composition = createProviderDerivedSandboxCompositionResult({
      gmailSignals: [
        {
          id: "provider-signal-gmail-application_detected-2026-06-11T09-00-00-000Z-001",
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
    const enrichment = adaptProviderDerivedSignalsToSyncEnrichment({
      composition,
      generatedAt: FIXED_GENERATED_AT,
    }).enrichment!;

    const canonical = validateCareerBundleUnifiedSyncEnrichment(enrichment, {
      rejectProviderIdentifiers: true,
    });
    const adapted = validateAdaptedCareerBundleSyncEnrichment(enrichment);

    expect(adapted.valid).toBe(canonical.valid);
    expect(adapted.warnings).toEqual(canonical.warnings);
  });

  it("returns equivalent invalid result for provider identifiers when strict mode is enabled", () => {
    const composition = createProviderDerivedSandboxCompositionResult({
      gmailSignals: [
        {
          id: "provider-signal-gmail-application_detected-2026-06-11T09-00-00-000Z-001",
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
    const enrichment = adaptProviderDerivedSignalsToSyncEnrichment({
      composition,
      generatedAt: FIXED_GENERATED_AT,
    }).enrichment!;
    enrichment.combinedSignals[0]!.providerId = "provider-message-id";

    const canonical = validateCareerBundleUnifiedSyncEnrichment(enrichment, {
      rejectProviderIdentifiers: true,
    });
    const adapted = validateAdaptedCareerBundleSyncEnrichment(enrichment);

    expect(adapted.valid).toBe(false);
    expect(canonical.valid).toBe(false);
    expect(adapted.warnings.some((warning) => warning.includes("provider identifiers"))).toBe(
      true,
    );
  });
});
