import {
  createCareerBundle,
  createCareerBundleWithSyncEnrichment,
  serializeCareerBundleWithSyncEnrichment,
} from "@devflow/career-core";
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
import { describe, expect, it } from "vitest";
import {
  buildInterviewLabSyncEnrichmentPreview,
  parseCareerBundleImportWithSyncPreview,
} from "./career-bundle-sync-preview";

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

describe("buildInterviewLabSyncEnrichmentPreview", () => {
  it("returns not_provided without enrichment", () => {
    expect(buildInterviewLabSyncEnrichmentPreview()).toEqual({
      available: false,
      status: "not_provided",
      warnings: [],
    });
  });

  it("returns provided preview with aggregated metadata", () => {
    const enrichment = buildSafeSyncEnrichment();
    const preview = buildInterviewLabSyncEnrichmentPreview(enrichment);
    expect(preview.available).toBe(true);
    expect(preview.status).toBe("provided");
    expect(preview.summary).toBe(enrichment.summary);
    expect(preview.totalSignals).toBe(4);
    expect(preview.actionRequiredCount).toBe(2);
    expect(preview.upcomingCount).toBe(2);
    expect(preview.companyHints).toEqual(["Acme", "Beta"]);
    expect(preview.sourceCounts).toEqual({ gmail: 2, calendar: 2 });
    expect(preview.stageCounts).toMatchObject({
      screening: 1,
      interview: 2,
      technical: 1,
    });
    expect(preview.privacy).toEqual(enrichment.privacy);
  });

  it("marks invalid enrichment when rawRetained is true", () => {
    const invalid = withPrivacyOverride(buildSafeSyncEnrichment(), { rawRetained: true });
    const preview = buildInterviewLabSyncEnrichmentPreview(invalid);
    expect(preview.available).toBe(false);
    expect(preview.status).toBe("invalid");
    expect(preview.warnings.length).toBeGreaterThan(0);
  });

  it("marks invalid enrichment when providerPayloadRetained is true", () => {
    const invalid = withPrivacyOverride(buildSafeSyncEnrichment(), {
      providerPayloadRetained: true,
    });
    const preview = buildInterviewLabSyncEnrichmentPreview(invalid);
    expect(preview.status).toBe("invalid");
  });

  it("marks invalid enrichment when meetingLinksRemoved is false", () => {
    const invalid = withPrivacyOverride(buildSafeSyncEnrichment(), {
      meetingLinksRemoved: false,
    });
    const preview = buildInterviewLabSyncEnrichmentPreview(invalid);
    expect(preview.status).toBe("invalid");
  });
});

describe("parseCareerBundleImportWithSyncPreview", () => {
  it("imports legacy bundle without syncEnrichment", () => {
    const legacy = createCareerBundle([]);
    const r = parseCareerBundleImportWithSyncPreview(legacy);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.preview.status).toBe("not_provided");
      expect(r.bundle.schemaVersion).toBe("1.0");
    }
  });

  it("imports bundle with safe syncEnrichment preview", () => {
    const enrichment = buildSafeSyncEnrichment();
    const bundle = createCareerBundleWithSyncEnrichment([], { syncEnrichment: enrichment });
    const r = parseCareerBundleImportWithSyncPreview(bundle);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.preview.available).toBe(true);
      expect(r.preview.totalSignals).toBe(4);
    }
  });

  it("ignores invalid syncEnrichment while keeping base bundle", () => {
    const invalid = withPrivacyOverride(buildSafeSyncEnrichment(), { rawRetained: true });
    const bundle = { ...createCareerBundle([]), syncEnrichment: invalid };
    const r = parseCareerBundleImportWithSyncPreview(bundle);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.preview.status).toBe("invalid");
      expect(r.bundle.applications).toEqual([]);
    }
  });

  it("serialized export preserves safe sync preview metadata without raw provider data", () => {
    const enrichment = buildSafeSyncEnrichment();
    const bundle = createCareerBundleWithSyncEnrichment([], {
      syncEnrichment: enrichment,
      exportedAt: FIXED_GENERATED_AT,
    });
    const serialized = serializeCareerBundleWithSyncEnrichment(bundle);
    expect(serialized).not.toMatch(/threadId/i);
    expect(serialized).not.toMatch(/"snippet"/);
    expect(serialized).not.toMatch(/"description"/);
    expect(serialized).not.toMatch(/hangoutLink|htmlLink|meet\.google\.com/i);

    const r = parseCareerBundleImportWithSyncPreview(JSON.parse(serialized));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.preview.available).toBe(true);
      expect(r.preview.summary).toBe(enrichment.summary);
    }
  });
});

describe("Interview Lab sync enrichment preview safety", () => {
  it("does not expose raw message body, calendar description, or meeting links in preview fields", () => {
    const enrichment = buildSafeSyncEnrichment();
    const preview = buildInterviewLabSyncEnrichmentPreview(enrichment);
    const serialized = JSON.stringify(preview);
    expect(serialized).not.toMatch(/threadId/i);
    expect(serialized).not.toMatch(/"snippet"/);
    expect(serialized).not.toMatch(/"description"/);
    expect(serialized).not.toMatch(/hangoutLink|htmlLink|meet\.google\.com/i);
    expect(preview.summary).not.toMatch(/https?:\/\//);
  });
});
