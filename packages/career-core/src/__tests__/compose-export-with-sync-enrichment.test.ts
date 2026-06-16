import { describe, expect, it } from "vitest";
import {
  buildCareerBundleCalendarEnrichment,
  buildCareerBundleGmailEnrichment,
  buildCareerBundleSyncEnrichment,
  buildCalendarSyncPreview,
  buildGmailSyncPreview,
  sampleInterviewCalendarEvent,
  sampleRecruiterEmail,
} from "@devflow/career-sync";
import { createCareerBundle, parseCareerBundleWithSyncEnrichment } from "../index.js";
import { composeCareerBundleExportWithSyncEnrichment } from "../career-bundle/compose-export-with-sync-enrichment.js";

const GENERATED_AT = "2026-06-15T12:00:00.000Z";
const FIXED_NOW = "2026-06-09T12:00:00.000Z";

function buildValidSyncEnrichment() {
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

describe("composeCareerBundleExportWithSyncEnrichment", () => {
  it("creates a new bundle with validated sync enrichment", () => {
    const base = createCareerBundle([
      {
        id: "app-1",
        company: "Acme",
        role: "Engineer",
        status: "saved",
        source: "manual",
        requiredSkills: ["TypeScript"],
      },
    ]);
    const enrichment = buildValidSyncEnrichment();

    const composed = composeCareerBundleExportWithSyncEnrichment(base, enrichment);

    expect(composed).not.toBe(base);
    expect(composed.syncEnrichment).toEqual(enrichment);
    const parsed = parseCareerBundleWithSyncEnrichment(composed);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.syncEnrichmentStatus).toBe("provided");
    }
  });

  it("does not mutate base bundle or enrichment", () => {
    const base = createCareerBundle([]);
    const enrichment = buildValidSyncEnrichment();
    const baseBefore = JSON.stringify(base);
    const enrichmentBefore = JSON.stringify(enrichment);

    composeCareerBundleExportWithSyncEnrichment(base, enrichment);

    expect(JSON.stringify(base)).toBe(baseBefore);
    expect(JSON.stringify(enrichment)).toBe(enrichmentBefore);
  });
});
