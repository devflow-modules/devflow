import { describe, expect, it } from "vitest";
import {
  assertEnrichmentChangePreviewSafe,
  buildCareerBundleCalendarEnrichment,
  buildCareerBundleGmailEnrichment,
  buildCareerBundleSyncEnrichment,
  buildCalendarSyncPreview,
  buildGmailSyncPreview,
  deriveEnrichmentChangePreview,
  displayValuesEqual,
  normalizeCompanyHints,
  sampleInterviewCalendarEvent,
  sampleInterviewInviteEmail,
  sampleRecruiterEmail,
  sampleTechnicalCalendarEvent,
  toSafeList,
  type CareerBundleUnifiedSyncEnrichment,
} from "../src/index.js";

const GENERATED_AT = "2026-06-15T12:00:00.000Z";
const FIXED_NOW = "2026-06-09T12:00:00.000Z";

function buildSafeSyncEnrichment(
  overrides: Partial<CareerBundleUnifiedSyncEnrichment> = {},
): CareerBundleUnifiedSyncEnrichment {
  const gmailPreview = buildGmailSyncPreview({
    messages: [sampleRecruiterEmail, sampleInterviewInviteEmail],
  });
  const calendarPreview = buildCalendarSyncPreview(
    { events: [sampleInterviewCalendarEvent, sampleTechnicalCalendarEvent] },
    { now: FIXED_NOW },
  );
  const gmail = buildCareerBundleGmailEnrichment(gmailPreview.signals, {
    generatedAt: GENERATED_AT,
  });
  const calendar = buildCareerBundleCalendarEnrichment(calendarPreview.signals, {
    generatedAt: GENERATED_AT,
  });

  const enrichment = buildCareerBundleSyncEnrichment(
    { gmail, calendar },
    { now: FIXED_NOW, generatedAt: GENERATED_AT },
  );

  return {
    ...enrichment,
    combinedSignals: enrichment.combinedSignals.map(({ providerId: _ignored, ...signal }) => signal),
    ...overrides,
    stats: {
      ...enrichment.stats,
      ...overrides.stats,
    },
  };
}

describe("deriveEnrichmentChangePreview", () => {
  it("returns invalid when proposed enrichment is missing", () => {
    const result = deriveEnrichmentChangePreview({ current: null, proposed: null });

    expect(result.status).toBe("invalid");
    expect(result.items).toEqual([]);
    expect(result.appliedToCareerBundle).toBe(false);
  });

  it("returns missing_current_value for all fields when current is empty", () => {
    const proposed = buildSafeSyncEnrichment();
    const result = deriveEnrichmentChangePreview({ current: null, proposed });

    expect(result.status).toBe("ready");
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.some((item) => item.status === "missing_current_value")).toBe(true);
  });

  it("returns unchanged when current and proposed normalize to the same values", () => {
    const enrichment = buildSafeSyncEnrichment();
    const result = deriveEnrichmentChangePreview({
      current: enrichment,
      proposed: enrichment,
    });

    expect(result.items.every((item) => item.status === "unchanged")).toBe(true);
  });

  it("detects additive company hints", () => {
    const current = buildSafeSyncEnrichment({
      stats: {
        ...buildSafeSyncEnrichment().stats,
        companyHints: ["Acme"],
      },
    });
    const proposed = buildSafeSyncEnrichment({
      stats: {
        ...buildSafeSyncEnrichment().stats,
        companyHints: ["Acme", "Beta"],
      },
    });

    const hintsItem = deriveEnrichmentChangePreview({ current, proposed }).items.find(
      (item) => item.field === "stats.companyHints",
    );

    expect(hintsItem?.status).toBe("additive_suggestion");
  });

  it("detects replacement for scalar stats", () => {
    const current = buildSafeSyncEnrichment();
    const proposed = buildSafeSyncEnrichment({
      stats: {
        ...current.stats,
        totalSignals: current.stats.totalSignals + 2,
      },
    });

    const item = deriveEnrichmentChangePreview({ current, proposed }).items.find(
      (entry) => entry.field === "stats.totalSignals",
    );

    expect(item?.status).toBe("replacement_suggestion");
  });

  it("detects conflict for disjoint company hints", () => {
    const current = buildSafeSyncEnrichment({
      stats: {
        ...buildSafeSyncEnrichment().stats,
        companyHints: ["Acme"],
      },
    });
    const proposed = buildSafeSyncEnrichment({
      stats: {
        ...buildSafeSyncEnrichment().stats,
        companyHints: ["Zeta"],
      },
    });

    const item = deriveEnrichmentChangePreview({ current, proposed }).items.find(
      (entry) => entry.field === "stats.companyHints",
    );

    expect(item?.status).toBe("conflict");
  });

  it("marks insufficient confidence when all proposed signals are low", () => {
    const proposed = buildSafeSyncEnrichment({
      combinedSignals: buildSafeSyncEnrichment().combinedSignals.map((signal) => ({
        ...signal,
        confidence: "low" as const,
      })),
    });

    const result = deriveEnrichmentChangePreview({ current: null, proposed });
    expect(result.items.some((item) => item.status === "insufficient_confidence")).toBe(true);
  });

  it("marks excluded_by_user when all proposed signals are excluded", () => {
    const proposed = buildSafeSyncEnrichment();
    const excludedSignalIds = proposed.combinedSignals.map((signal) => signal.id);

    const result = deriveEnrichmentChangePreview({
      current: null,
      proposed,
      excludedSignalIds,
    });

    expect(result.items.some((item) => item.status === "excluded_by_user")).toBe(true);
  });

  it("sorts items deterministically by field", () => {
    const proposed = buildSafeSyncEnrichment();
    const fields = deriveEnrichmentChangePreview({ current: null, proposed }).items.map(
      (item) => item.field,
    );

    expect(fields).toEqual([...fields].sort((left, right) => left.localeCompare(right)));
  });

  it("does not mutate frozen input", () => {
    const proposed = buildSafeSyncEnrichment();
    const current = buildSafeSyncEnrichment({
      stats: {
        ...proposed.stats,
        totalSignals: 1,
      },
    });

    Object.freeze(proposed);
    Object.freeze(current);

    deriveEnrichmentChangePreview({ current, proposed });

    expect(current.stats.totalSignals).toBe(1);
  });

  it("passes forbidden-key safety assertion", () => {
    const result = deriveEnrichmentChangePreview({
      current: null,
      proposed: buildSafeSyncEnrichment(),
    });

    expect(() => assertEnrichmentChangePreviewSafe(result)).not.toThrow();
    expect(JSON.stringify(result)).not.toMatch(
      /access_token|connectionId|providerId|messageId|subject|snippet|body|description|location|meetingLink/i,
    );
  });
});

describe("normalizeCompanyHints", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeCompanyHints([" Acme ", "acme", "Beta"])).toEqual(["acme", "beta"]);
  });
});

describe("displayValuesEqual", () => {
  it("treats normalized lists with different input order as equal", () => {
    expect(displayValuesEqual(toSafeList(["a", "b"]), toSafeList(["b", "a"]))).toBe(true);
  });
});
