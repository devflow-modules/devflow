import { describe, expect, it } from "vitest";
import {
  buildCareerBundleCalendarEnrichment,
  buildCareerBundleGmailEnrichment,
  buildCareerBundleSyncEnrichment,
  buildCareerBundleSyncSummary,
  buildGmailSyncPreview,
  buildCalendarSyncPreview,
  sampleInterviewCalendarEvent,
  sampleInterviewInviteEmail,
  sampleRecruiterEmail,
  sampleTechnicalCalendarEvent,
  shouldRetainRawProviderData,
  summarizeCareerBundleSync,
} from "../src/index.js";

const FIXED_NOW = "2026-06-09T12:00:00.000Z";
const FIXED_GENERATED_AT = "2026-06-09T12:00:00.000Z";

function buildFixtureEnrichments() {
  const gmailPreview = buildGmailSyncPreview({
    messages: [sampleRecruiterEmail, sampleInterviewInviteEmail],
  });
  const calendarPreview = buildCalendarSyncPreview(
    { events: [sampleInterviewCalendarEvent, sampleTechnicalCalendarEvent] },
    { now: FIXED_NOW },
  );
  return {
    gmail: buildCareerBundleGmailEnrichment(gmailPreview.signals, {
      generatedAt: FIXED_GENERATED_AT,
    }),
    calendar: buildCareerBundleCalendarEnrichment(calendarPreview.signals, {
      generatedAt: FIXED_GENERATED_AT,
    }),
  };
}

describe("CareerBundle sync enrichment contract", () => {
  it("combines Gmail and Calendar enrichments", () => {
    const { gmail, calendar } = buildFixtureEnrichments();
    const unified = buildCareerBundleSyncEnrichment({ gmail, calendar }, { now: FIXED_NOW });
    expect(unified.source).toBe("sync");
    expect(unified.gmail).toBe(gmail);
    expect(unified.calendar).toBe(calendar);
  });

  it("returns combinedSignals with sum of source signals", () => {
    const { gmail, calendar } = buildFixtureEnrichments();
    const unified = buildCareerBundleSyncEnrichment({ gmail, calendar }, { now: FIXED_NOW });
    expect(unified.combinedSignals).toHaveLength(4);
    expect(unified.stats.totalSignals).toBe(4);
  });

  it("deduplicates and sorts companyHints", () => {
    const { gmail, calendar } = buildFixtureEnrichments();
    const unified = buildCareerBundleSyncEnrichment({ gmail, calendar }, { now: FIXED_NOW });
    expect(unified.stats.companyHints).toEqual(["Acme", "Beta"]);
  });

  it("calculates stageCounts", () => {
    const { gmail, calendar } = buildFixtureEnrichments();
    const unified = buildCareerBundleSyncEnrichment({ gmail, calendar }, { now: FIXED_NOW });
    expect(unified.stats.stageCounts).toMatchObject({
      screening: 1,
      interview: 2,
      technical: 1,
    });
  });

  it("calculates sourceCounts", () => {
    const { gmail, calendar } = buildFixtureEnrichments();
    const unified = buildCareerBundleSyncEnrichment({ gmail, calendar }, { now: FIXED_NOW });
    expect(unified.stats.sourceCounts).toEqual({ gmail: 2, calendar: 2 });
  });

  it("calculates actionRequiredCount", () => {
    const { gmail, calendar } = buildFixtureEnrichments();
    const unified = buildCareerBundleSyncEnrichment({ gmail, calendar }, { now: FIXED_NOW });
    expect(unified.stats.actionRequiredCount).toBe(2);
  });

  it("calculates upcomingCount with fixed now", () => {
    const { gmail, calendar } = buildFixtureEnrichments();
    const unified = buildCareerBundleSyncEnrichment(
      { gmail, calendar },
      { now: FIXED_NOW, generatedAt: FIXED_GENERATED_AT },
    );
    expect(unified.stats.upcomingCount).toBe(2);
  });

  it("accepts fixed generatedAt", () => {
    const { gmail, calendar } = buildFixtureEnrichments();
    const unified = buildCareerBundleSyncEnrichment(
      { gmail, calendar },
      { generatedAt: FIXED_GENERATED_AT, now: FIXED_NOW },
    );
    expect(unified.generatedAt).toBe(FIXED_GENERATED_AT);
  });

  it("does not include raw messages or events", () => {
    const { gmail, calendar } = buildFixtureEnrichments();
    const unified = buildCareerBundleSyncEnrichment({ gmail, calendar }, { now: FIXED_NOW });
    expect(unified).not.toHaveProperty("messages");
    expect(unified).not.toHaveProperty("events");
    const serialized = JSON.stringify(unified);
    expect(serialized).not.toMatch(/threadId/i);
    expect(serialized).not.toMatch(/"snippet"/);
    expect(serialized).not.toMatch(/"description"/);
  });

  it("does not include provider payloads or meeting links", () => {
    const { gmail, calendar } = buildFixtureEnrichments();
    const unified = buildCareerBundleSyncEnrichment({ gmail, calendar }, { now: FIXED_NOW });
    const serialized = JSON.stringify(unified);
    expect(serialized).not.toMatch(/hangoutLink|htmlLink|meet\.google\.com/i);
    for (const signal of unified.combinedSignals) {
      expect(signal.rawRetained).toBe(false);
      expect(signal.safeSummary).not.toMatch(/https?:\/\//);
    }
  });

  it("keeps privacy flags safe", () => {
    const { gmail, calendar } = buildFixtureEnrichments();
    const unified = buildCareerBundleSyncEnrichment({ gmail, calendar }, { now: FIXED_NOW });
    expect(unified.privacy).toEqual({
      rawRetained: false,
      redacted: true,
      meetingLinksRemoved: true,
      providerPayloadRetained: false,
      userReviewRequired: true,
    });
    expect(shouldRetainRawProviderData()).toBe(false);
  });

  it("returns safe enrichment for empty input", () => {
    const unified = buildCareerBundleSyncEnrichment({}, { generatedAt: FIXED_GENERATED_AT, now: FIXED_NOW });
    expect(unified.combinedSignals).toEqual([]);
    expect(unified.stats.totalSignals).toBe(0);
    expect(unified.stats.sourceCounts).toEqual({ gmail: 0, calendar: 0 });
    expect(unified.privacy.userReviewRequired).toBe(true);
    expect(unified.gmail).toBeUndefined();
    expect(unified.calendar).toBeUndefined();
  });

  it("is deterministic", () => {
    const { gmail, calendar } = buildFixtureEnrichments();
    const first = buildCareerBundleSyncEnrichment({ gmail, calendar }, { now: FIXED_NOW });
    const second = buildCareerBundleSyncEnrichment({ gmail, calendar }, { now: FIXED_NOW });
    expect(first).toEqual(second);
  });

  it("summarizeCareerBundleSync produces deterministic text", () => {
    const { gmail, calendar } = buildFixtureEnrichments();
    const signals = [...gmail.signals, ...calendar.signals];
    const stats = buildCareerBundleSyncSummary(signals, FIXED_NOW);
    const summary = summarizeCareerBundleSync(signals, stats);
    expect(summary).toBe(
      "CareerBundle sync: 4 signal(s), 2 action required, 2 upcoming. Sources: gmail=2, calendar=2. Stages: interview=2, screening=1, technical=1. Companies: Acme, Beta.",
    );
  });
});
