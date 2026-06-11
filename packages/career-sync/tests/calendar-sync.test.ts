import { describe, expect, it } from "vitest";
import {
  buildCalendarSyncPreview,
  buildCareerBundleCalendarEnrichment,
  buildNangoCalendarSyncPreview,
  sampleInterviewCalendarEvent,
  sampleNangoCalendarInterviewEvent,
  sampleNangoPrivateCalendarEvent,
  samplePrivateCalendarEvent,
  sampleTechnicalCalendarEvent,
  shouldRetainRawProviderData,
  summarizeCalendarSignals,
} from "../src/index.js";

const FIXED_NOW = "2026-06-09T12:00:00.000Z";

const careerCalendarFixtures = [
  sampleInterviewCalendarEvent,
  sampleTechnicalCalendarEvent,
];

describe("Calendar read-only sync prototype", () => {
  it("buildCalendarSyncPreview counts totalEvents and signalCount", () => {
    const preview = buildCalendarSyncPreview(
      { events: [...careerCalendarFixtures, samplePrivateCalendarEvent] },
      { now: FIXED_NOW },
    );
    expect(preview.totalEvents).toBe(3);
    expect(preview.signalCount).toBe(2);
    expect(preview.source).toBe("calendar");
  });

  it("buildCalendarSyncPreview counts upcoming with fixed now", () => {
    const preview = buildCalendarSyncPreview(
      { events: careerCalendarFixtures },
      { now: FIXED_NOW },
    );
    expect(preview.upcomingCount).toBe(2);
  });

  it("buildCalendarSyncPreview stageCounts includes interview and technical", () => {
    const preview = buildCalendarSyncPreview({ events: careerCalendarFixtures }, { now: FIXED_NOW });
    expect(preview.stageCounts).toMatchObject({
      interview: 1,
      technical: 1,
    });
  });

  it("buildCalendarSyncPreview deduplicates and sorts companyHints", () => {
    const preview = buildCalendarSyncPreview({ events: careerCalendarFixtures }, { now: FIXED_NOW });
    expect(preview.companyHints).toEqual(["Acme", "Beta"]);
  });

  it("buildNangoCalendarSyncPreview uses Nango mapper and does not leak links", () => {
    const preview = buildNangoCalendarSyncPreview(
      {
        events: [sampleNangoCalendarInterviewEvent, sampleNangoPrivateCalendarEvent],
      },
      { now: FIXED_NOW },
    );
    expect(preview.totalEvents).toBe(2);
    expect(preview.signalCount).toBe(1);
    expect(JSON.stringify(preview)).not.toMatch(/hangoutLink|htmlLink|meet\.google\.com/i);
    expect(preview.privacy.meetingLinksRemoved).toBe(true);
    expect(preview.privacy.rawRetained).toBe(false);
    expect(preview.privacy.redacted).toBe(true);
  });

  it("summarizeCalendarSignals produces deterministic text", () => {
    const preview = buildCalendarSyncPreview({ events: careerCalendarFixtures }, { now: FIXED_NOW });
    const summary = summarizeCalendarSignals(preview.signals, FIXED_NOW);
    expect(summary).toBe(
      "Calendar sync: 2 signal(s), 2 upcoming. Stages: interview=1, technical=1. Companies: Acme, Beta.",
    );
    expect(summarizeCalendarSignals(preview.signals, FIXED_NOW)).toBe(summary);
  });

  it("buildCareerBundleCalendarEnrichment excludes raw events", () => {
    const preview = buildCalendarSyncPreview({ events: careerCalendarFixtures }, { now: FIXED_NOW });
    const enrichment = buildCareerBundleCalendarEnrichment(preview.signals, {
      generatedAt: FIXED_NOW,
    });
    expect(enrichment).not.toHaveProperty("events");
    expect(enrichment.signals).toHaveLength(2);
    expect(enrichment.source).toBe("calendar");
    expect(enrichment.summary).toContain("Calendar sync:");
  });

  it("buildCareerBundleCalendarEnrichment accepts fixed generatedAt", () => {
    const preview = buildCalendarSyncPreview({ events: [sampleInterviewCalendarEvent] }, { now: FIXED_NOW });
    const enrichment = buildCareerBundleCalendarEnrichment(preview.signals, {
      generatedAt: FIXED_NOW,
    });
    expect(enrichment.generatedAt).toBe(FIXED_NOW);
  });

  it("rawRetained is always false", () => {
    const preview = buildCalendarSyncPreview({ events: careerCalendarFixtures }, { now: FIXED_NOW });
    const enrichment = buildCareerBundleCalendarEnrichment(preview.signals);
    expect(preview.privacy.rawRetained).toBe(false);
    expect(enrichment.rawRetained).toBe(false);
    expect(shouldRetainRawProviderData()).toBe(false);
    for (const signal of preview.signals) {
      expect(signal.rawRetained).toBe(false);
    }
  });

  it("meetingLinksRemoved is always true", () => {
    const preview = buildNangoCalendarSyncPreview(
      { events: [sampleNangoCalendarInterviewEvent] },
      { now: FIXED_NOW },
    );
    expect(preview.privacy.meetingLinksRemoved).toBe(true);
  });

  it("ignores unrelated private calendar events", () => {
    const preview = buildCalendarSyncPreview(
      { events: [samplePrivateCalendarEvent] },
      { now: FIXED_NOW },
    );
    expect(preview.signalCount).toBe(0);
  });

  it("is deterministic", () => {
    const first = buildCalendarSyncPreview({ events: careerCalendarFixtures }, { now: FIXED_NOW });
    const second = buildCalendarSyncPreview({ events: careerCalendarFixtures }, { now: FIXED_NOW });
    expect(first).toEqual(second);
  });
});
