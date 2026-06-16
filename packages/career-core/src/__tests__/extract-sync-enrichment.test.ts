import { describe, expect, it } from "vitest";
import {
  createCareerBundle,
  createCareerBundleWithSyncEnrichment,
  extractCareerBundleSyncEnrichment,
} from "../index.js";
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

describe("extractCareerBundleSyncEnrichment", () => {
  it("returns null for missing input", () => {
    expect(extractCareerBundleSyncEnrichment(null)).toBeNull();
    expect(extractCareerBundleSyncEnrichment(undefined)).toBeNull();
  });

  it("returns null for invalid bundle", () => {
    expect(extractCareerBundleSyncEnrichment({ schemaVersion: "9.9" })).toBeNull();
  });

  it("returns null when bundle has no syncEnrichment", () => {
    const bundle = createCareerBundle([]);
    expect(extractCareerBundleSyncEnrichment(bundle)).toBeNull();
  });

  it("returns validated sync enrichment when present", () => {
    const enrichment = buildValidSyncEnrichment();
    const bundle = createCareerBundleWithSyncEnrichment([], { syncEnrichment: enrichment });

    const extracted = extractCareerBundleSyncEnrichment(bundle);

    expect(extracted).not.toBeNull();
    expect(extracted?.source).toBe("sync");
    expect(extracted?.stats.totalSignals).toBeGreaterThan(0);
  });

  it("does not mutate the bundle", () => {
    const enrichment = buildValidSyncEnrichment();
    const bundle = createCareerBundleWithSyncEnrichment([], { syncEnrichment: enrichment });
    const before = JSON.stringify(bundle);

    extractCareerBundleSyncEnrichment(bundle);

    expect(JSON.stringify(bundle)).toBe(before);
  });

  it("does not leak candidate or applications in the return value", () => {
    const bundle = createCareerBundleWithSyncEnrichment(
      [
        {
          id: "app-1",
          company: "Acme",
          role: "Engineer",
          status: "saved",
          source: "manual",
          requiredSkills: ["TypeScript"],
        },
      ],
      {
        candidate: { name: "Candidate", targetRole: "Engineer" },
        syncEnrichment: buildValidSyncEnrichment(),
      },
    );

    const extracted = extractCareerBundleSyncEnrichment(bundle);
    const serialized = JSON.stringify(extracted);

    expect(serialized).not.toContain("applications");
    expect(serialized).not.toContain("candidate");
    expect(serialized).not.toContain("exportedAt");
    expect(serialized).not.toContain("sourceProduct");
    expect(serialized).not.toMatch(/access_token|connectionId/i);
  });
});
