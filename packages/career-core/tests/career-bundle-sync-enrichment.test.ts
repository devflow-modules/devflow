import { describe, expect, it } from "vitest";
import {
  buildCareerBundleCalendarEnrichment,
  buildCareerBundleGmailEnrichment,
  buildCareerBundleSyncEnrichment,
  buildCalendarSyncPreview,
  buildGmailSyncPreview,
  sampleInterviewCalendarEvent,
  sampleInterviewInviteEmail,
  sampleRecruiterEmail,
  sampleTechnicalCalendarEvent,
  type CareerBundleUnifiedSyncEnrichment,
} from "@devflow/career-sync";
import { createCareerBundle } from "../src/bundle-helpers.js";
import {
  attachSyncEnrichmentToCareerBundle,
  hasCareerBundleSyncEnrichment,
  validateCareerBundleSyncEnrichment,
} from "../src/career-bundle/sync-enrichment.js";

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

describe("validateCareerBundleSyncEnrichment", () => {
  it("returns not_provided without input", () => {
    expect(validateCareerBundleSyncEnrichment()).toEqual({
      status: "not_provided",
      warnings: [],
    });
    expect(validateCareerBundleSyncEnrichment(null)).toEqual({
      status: "not_provided",
      warnings: [],
    });
  });

  it("returns provided for safe enrichment", () => {
    const enrichment = buildSafeSyncEnrichment();
    const result = validateCareerBundleSyncEnrichment(enrichment);
    expect(result.status).toBe("provided");
    expect(result.syncEnrichment).toBe(enrichment);
    expect(result.warnings).toEqual([]);
  });

  it("returns invalid when rawRetained is true", () => {
    const enrichment = withPrivacyOverride(buildSafeSyncEnrichment(), { rawRetained: true });
    const result = validateCareerBundleSyncEnrichment(enrichment);
    expect(result.status).toBe("invalid");
    expect(result.syncEnrichment).toBeUndefined();
    expect(result.warnings.some((w) => w.includes("rawRetained"))).toBe(true);
  });

  it("returns invalid when providerPayloadRetained is true", () => {
    const enrichment = withPrivacyOverride(buildSafeSyncEnrichment(), {
      providerPayloadRetained: true,
    });
    const result = validateCareerBundleSyncEnrichment(enrichment);
    expect(result.status).toBe("invalid");
    expect(result.warnings.some((w) => w.includes("providerPayloadRetained"))).toBe(true);
  });

  it("returns invalid when meetingLinksRemoved is false", () => {
    const enrichment = withPrivacyOverride(buildSafeSyncEnrichment(), {
      meetingLinksRemoved: false,
    });
    const result = validateCareerBundleSyncEnrichment(enrichment);
    expect(result.status).toBe("invalid");
    expect(result.warnings.some((w) => w.includes("meetingLinksRemoved"))).toBe(true);
  });

  it("returns warning when userReviewRequired is not true", () => {
    const enrichment = withPrivacyOverride(buildSafeSyncEnrichment(), {
      userReviewRequired: false,
    });
    const result = validateCareerBundleSyncEnrichment(enrichment);
    expect(result.status).toBe("provided");
    expect(result.syncEnrichment).toBe(enrichment);
    expect(result.warnings.some((w) => w.includes("userReviewRequired"))).toBe(true);
  });

  it("does not mutate the enrichment received", () => {
    const enrichment = buildSafeSyncEnrichment();
    const snapshot = structuredClone(enrichment);
    validateCareerBundleSyncEnrichment(enrichment);
    expect(enrichment).toEqual(snapshot);
  });
});

describe("attachSyncEnrichmentToCareerBundle", () => {
  it("preserves original bundle fields", () => {
    const bundle = createCareerBundle([], { name: "Dev", targetRole: "Backend" });
    const enrichment = buildSafeSyncEnrichment();
    const attached = attachSyncEnrichmentToCareerBundle(bundle, { syncEnrichment: enrichment });
    expect(attached.schemaVersion).toBe(bundle.schemaVersion);
    expect(attached.exportedAt).toBe(bundle.exportedAt);
    expect(attached.sourceProduct).toBe(bundle.sourceProduct);
    expect(attached.candidate).toEqual(bundle.candidate);
    expect(attached.applications).toEqual(bundle.applications);
  });

  it("attaches safe enrichment", () => {
    const bundle = createCareerBundle([]);
    const enrichment = buildSafeSyncEnrichment();
    const attached = attachSyncEnrichmentToCareerBundle(bundle, { syncEnrichment: enrichment });
    expect(attached.syncEnrichment).toBe(enrichment);
  });

  it("does not attach invalid enrichment", () => {
    const bundle = createCareerBundle([]);
    const invalid = withPrivacyOverride(buildSafeSyncEnrichment(), { rawRetained: true });
    const attached = attachSyncEnrichmentToCareerBundle(bundle, { syncEnrichment: invalid });
    expect(attached).not.toHaveProperty("syncEnrichment");
  });

  it("does not attach when input is empty", () => {
    const bundle = createCareerBundle([]);
    const attached = attachSyncEnrichmentToCareerBundle(bundle, {});
    expect(attached).not.toHaveProperty("syncEnrichment");
  });

  it("does not mutate the original bundle", () => {
    const bundle = createCareerBundle([], { name: "Original" });
    const enrichment = buildSafeSyncEnrichment();
    attachSyncEnrichmentToCareerBundle(bundle, { syncEnrichment: enrichment });
    expect(bundle).not.toHaveProperty("syncEnrichment");
    expect(bundle.candidate?.name).toBe("Original");
  });
});

describe("hasCareerBundleSyncEnrichment", () => {
  it("returns false without enrichment", () => {
    expect(hasCareerBundleSyncEnrichment({})).toBe(false);
    expect(hasCareerBundleSyncEnrichment({ syncEnrichment: null })).toBe(false);
  });

  it("returns true with enrichment", () => {
    const enrichment = buildSafeSyncEnrichment();
    expect(hasCareerBundleSyncEnrichment({ syncEnrichment: enrichment })).toBe(true);
  });
});

describe("CareerBundle sync enrichment fixtures", () => {
  it("uses safe fixture without raw messages, events, or provider payloads", () => {
    const enrichment = buildSafeSyncEnrichment();
    const serialized = JSON.stringify(enrichment);
    expect(serialized).not.toMatch(/threadId/i);
    expect(serialized).not.toMatch(/"snippet"/);
    expect(serialized).not.toMatch(/"description"/);
    expect(serialized).not.toMatch(/hangoutLink|htmlLink|meet\.google\.com/i);
    for (const signal of enrichment.combinedSignals) {
      expect(signal.rawRetained).toBe(false);
    }
  });
});
