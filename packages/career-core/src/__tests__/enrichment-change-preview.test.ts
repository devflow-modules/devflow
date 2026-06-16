import { describe, expect, it } from "vitest";
import { createCareerBundleWithSyncEnrichment, deriveCareerBundleEnrichmentChangePreview } from "../index.js";
import {
  buildCareerBundleCalendarEnrichment,
  buildCareerBundleGmailEnrichment,
  buildCareerBundleSyncEnrichment,
  buildCalendarSyncPreview,
  buildGmailSyncPreview,
  sampleInterviewCalendarEvent,
  sampleRecruiterEmail,
} from "@devflow/career-sync";

const GENERATED_AT = "2026-06-15T12:00:00.000Z";
const FIXED_NOW = "2026-06-09T12:00:00.000Z";

function buildProposedEnrichment() {
  const gmailPreview = buildGmailSyncPreview({ messages: [sampleRecruiterEmail] });
  const calendarPreview = buildCalendarSyncPreview(
    { events: [sampleInterviewCalendarEvent] },
    { now: FIXED_NOW },
  );
  const gmail = buildCareerBundleGmailEnrichment(gmailPreview.signals, { generatedAt: GENERATED_AT });
  const calendar = buildCareerBundleCalendarEnrichment(calendarPreview.signals, {
    generatedAt: GENERATED_AT,
  });
  return buildCareerBundleSyncEnrichment({ gmail, calendar }, { now: FIXED_NOW, generatedAt: GENERATED_AT });
}

describe("deriveCareerBundleEnrichmentChangePreview", () => {
  it("uses bundle sync enrichment as current value when present", () => {
    const proposed = buildProposedEnrichment();
    const bundle = createCareerBundleWithSyncEnrichment([], { syncEnrichment: proposed });

    const result = deriveCareerBundleEnrichmentChangePreview({
      bundle,
      proposed,
    });

    expect(result.items.some((item) => item.status === "unchanged")).toBe(true);
  });

  it("treats bundle without sync enrichment as empty current", () => {
    const bundle = createCareerBundleWithSyncEnrichment([]);
    const proposed = buildProposedEnrichment();

    const result = deriveCareerBundleEnrichmentChangePreview({
      bundle,
      proposed,
    });

    expect(result.items.some((item) => item.status === "missing_current_value")).toBe(true);
  });
});
