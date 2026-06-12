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
import {
  createCareerBundle,
  parseCareerBundle,
} from "../src/bundle-helpers.js";
import {
  createCareerBundleWithSyncEnrichment,
  parseCareerBundleWithSyncEnrichment,
  serializeCareerBundleWithSyncEnrichment,
} from "../src/career-bundle/sync-export.js";
import type { CareerApplication } from "../src/schemas/careerApplication.js";

const FIXED_NOW = "2026-06-09T12:00:00.000Z";
const FIXED_GENERATED_AT = "2026-06-09T12:00:00.000Z";
const FIXED_EXPORTED_AT = "2026-06-09T12:00:00.000Z";

const baseApp = (): CareerApplication => ({
  id: "a1",
  company: "Acme",
  role: "Backend Engineer",
  source: "linkedin",
  requiredSkills: ["Zod", "Node"],
  status: "applied",
});

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

describe("CareerBundle sync enrichment export support", () => {
  it("keeps legacy bundles without syncEnrichment valid", () => {
    const legacy = createCareerBundle([baseApp()], { name: "Dev" });
    const parsed = parseCareerBundle(legacy);
    expect(parsed.ok).toBe(true);

    const parsedWithSync = parseCareerBundleWithSyncEnrichment(legacy);
    expect(parsedWithSync.ok).toBe(true);
    if (parsedWithSync.ok) {
      expect(parsedWithSync.syncEnrichmentStatus).toBe("not_provided");
      expect(parsedWithSync.data).not.toHaveProperty("syncEnrichment");
    }
  });

  it("keeps parseCareerBundle ignoring unknown syncEnrichment field", () => {
    const enrichment = buildSafeSyncEnrichment();
    const bundleWithExtra = {
      ...createCareerBundle([baseApp()]),
      syncEnrichment: enrichment,
    };
    const parsed = parseCareerBundle(bundleWithExtra);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data).not.toHaveProperty("syncEnrichment");
    }
  });

  it("accepts bundle with safe syncEnrichment", () => {
    const enrichment = buildSafeSyncEnrichment();
    const bundle = createCareerBundleWithSyncEnrichment([baseApp()], { syncEnrichment: enrichment, exportedAt: FIXED_EXPORTED_AT });
    const parsed = parseCareerBundleWithSyncEnrichment(bundle);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.syncEnrichmentStatus).toBe("provided");
      expect(parsed.data.syncEnrichment).toEqual(enrichment);
    }
  });

  it("ignores syncEnrichment with rawRetained true", () => {
    const invalid = withPrivacyOverride(buildSafeSyncEnrichment(), { rawRetained: true });
    const parsed = parseCareerBundleWithSyncEnrichment({
      ...createCareerBundle([baseApp()]),
      syncEnrichment: invalid,
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.syncEnrichmentStatus).toBe("invalid");
      expect(parsed.data).not.toHaveProperty("syncEnrichment");
      expect(parsed.warnings.length).toBeGreaterThan(0);
    }
  });

  it("ignores syncEnrichment with providerPayloadRetained true", () => {
    const invalid = withPrivacyOverride(buildSafeSyncEnrichment(), {
      providerPayloadRetained: true,
    });
    const parsed = parseCareerBundleWithSyncEnrichment({
      ...createCareerBundle([baseApp()]),
      syncEnrichment: invalid,
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.syncEnrichmentStatus).toBe("invalid");
      expect(parsed.data).not.toHaveProperty("syncEnrichment");
    }
  });

  it("ignores syncEnrichment with meetingLinksRemoved false", () => {
    const invalid = withPrivacyOverride(buildSafeSyncEnrichment(), {
      meetingLinksRemoved: false,
    });
    const parsed = parseCareerBundleWithSyncEnrichment({
      ...createCareerBundle([baseApp()]),
      syncEnrichment: invalid,
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.syncEnrichmentStatus).toBe("invalid");
      expect(parsed.data).not.toHaveProperty("syncEnrichment");
    }
  });

  it("preserves safe syncEnrichment through serialize and parse round-trip", () => {
    const enrichment = buildSafeSyncEnrichment();
    const bundle = createCareerBundleWithSyncEnrichment([baseApp()], { syncEnrichment: enrichment, exportedAt: FIXED_EXPORTED_AT });
    const serialized = serializeCareerBundleWithSyncEnrichment(bundle);
    const parsed = parseCareerBundleWithSyncEnrichment(JSON.parse(serialized));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.syncEnrichmentStatus).toBe("provided");
      expect(parsed.data.syncEnrichment?.generatedAt).toBe(FIXED_GENERATED_AT);
      expect(parsed.data.syncEnrichment?.combinedSignals).toHaveLength(4);
    }
  });

  it("serialized bundle does not include raw messages, events, provider payloads, or meeting links", () => {
    const enrichment = buildSafeSyncEnrichment();
    const bundle = createCareerBundleWithSyncEnrichment([baseApp()], { syncEnrichment: enrichment, exportedAt: FIXED_EXPORTED_AT });
    const serialized = serializeCareerBundleWithSyncEnrichment(bundle);
    expect(serialized).not.toMatch(/threadId/i);
    expect(serialized).not.toMatch(/"snippet"/);
    expect(serialized).not.toMatch(/"description"/);
    expect(serialized).not.toMatch(/hangoutLink|htmlLink|meet\.google\.com/i);
  });

  it("does not serialize invalid syncEnrichment", () => {
    const invalid = withPrivacyOverride(buildSafeSyncEnrichment(), { rawRetained: true });
    const bundle = {
      ...createCareerBundle([baseApp()], undefined),
      syncEnrichment: invalid,
    };
    const serialized = serializeCareerBundleWithSyncEnrichment(bundle);
    const parsed = JSON.parse(serialized) as Record<string, unknown>;
    expect(parsed).not.toHaveProperty("syncEnrichment");
  });

  it("does not mutate the original bundle object", () => {
    const enrichment = buildSafeSyncEnrichment();
    const original = createCareerBundle([baseApp()], { name: "Original" });
    const snapshot = structuredClone(original);
    createCareerBundleWithSyncEnrichment([baseApp()], { syncEnrichment: enrichment });
    parseCareerBundleWithSyncEnrichment({ ...original, syncEnrichment: enrichment });
    serializeCareerBundleWithSyncEnrichment({ ...original, syncEnrichment: enrichment });
    expect(original).toEqual(snapshot);
    expect(original).not.toHaveProperty("syncEnrichment");
  });

  it("createCareerBundleWithSyncEnrichment does not attach invalid enrichment", () => {
    const invalid = withPrivacyOverride(buildSafeSyncEnrichment(), { rawRetained: true });
    const bundle = createCareerBundleWithSyncEnrichment([baseApp()], { syncEnrichment: invalid });
    expect(bundle).not.toHaveProperty("syncEnrichment");
  });

  it("uses safe fixture built with buildCareerBundleSyncEnrichment", () => {
    const enrichment = buildSafeSyncEnrichment();
    expect(enrichment.source).toBe("sync");
    expect(enrichment.privacy.rawRetained).toBe(false);
    for (const signal of enrichment.combinedSignals) {
      expect(signal.rawRetained).toBe(false);
    }
  });
});
