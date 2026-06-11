import { describe, expect, it } from "vitest";
import {
  buildCareerBundleGmailEnrichment,
  buildGmailSyncPreview,
  buildNangoGmailSyncPreview,
  sampleInterviewInviteEmail,
  sampleNangoInterviewMessage,
  sampleNangoRecruiterMessage,
  sampleNangoTechnicalAssignmentMessage,
  sampleRecruiterEmail,
  sampleRejectionEmail,
  sampleTechnicalAssignmentEmail,
  shouldRetainRawProviderData,
  summarizeGmailSignals,
} from "../src/index.js";

const allGmailFixtures = [
  sampleRecruiterEmail,
  sampleInterviewInviteEmail,
  sampleRejectionEmail,
  sampleTechnicalAssignmentEmail,
];

describe("Gmail read-only sync prototype", () => {
  it("buildGmailSyncPreview counts totalMessages and signalCount", () => {
    const preview = buildGmailSyncPreview({ messages: allGmailFixtures });
    expect(preview.totalMessages).toBe(4);
    expect(preview.signalCount).toBe(4);
    expect(preview.source).toBe("gmail");
  });

  it("buildGmailSyncPreview counts actionRequired", () => {
    const preview = buildGmailSyncPreview({ messages: allGmailFixtures });
    expect(preview.actionRequiredCount).toBe(3);
  });

  it("buildGmailSyncPreview stageCounts includes screening, interview, technical, rejected", () => {
    const preview = buildGmailSyncPreview({ messages: allGmailFixtures });
    expect(preview.stageCounts).toMatchObject({
      screening: 1,
      interview: 1,
      technical: 1,
      rejected: 1,
    });
  });

  it("buildGmailSyncPreview deduplicates companyHints", () => {
    const preview = buildGmailSyncPreview({
      messages: [sampleRecruiterEmail, sampleInterviewInviteEmail],
    });
    expect(preview.companyHints).toEqual(["Acme"]);
  });

  it("buildNangoGmailSyncPreview uses Nango mapper and does not leak raw payloads", () => {
    const preview = buildNangoGmailSyncPreview({
      messages: [
        sampleNangoRecruiterMessage,
        sampleNangoInterviewMessage,
        sampleNangoTechnicalAssignmentMessage,
      ],
    });
    expect(preview.totalMessages).toBe(3);
    expect(preview.signalCount).toBe(3);
    expect(JSON.stringify(preview)).not.toMatch(/threadId|payload|hangoutLink/i);
    expect(preview.privacy.rawRetained).toBe(false);
    expect(preview.privacy.redacted).toBe(true);
  });

  it("summarizeGmailSignals produces deterministic text", () => {
    const preview = buildGmailSyncPreview({ messages: allGmailFixtures });
    const summary = summarizeGmailSignals(preview.signals);
    expect(summary).toBe(
      "Gmail sync: 4 signal(s), 3 require action. Stages: interview=1, rejected=1, screening=1, technical=1. Companies: Acme, Greenhouse, Startup.",
    );
    expect(summarizeGmailSignals(preview.signals)).toBe(summary);
  });

  it("buildCareerBundleGmailEnrichment excludes raw messages", () => {
    const preview = buildGmailSyncPreview({ messages: allGmailFixtures });
    const enrichment = buildCareerBundleGmailEnrichment(preview.signals, {
      generatedAt: "2026-06-09T12:00:00.000Z",
    });
    expect(enrichment).not.toHaveProperty("messages");
    expect(enrichment.signals).toHaveLength(4);
    expect(enrichment.source).toBe("gmail");
    expect(enrichment.summary).toContain("Gmail sync:");
  });

  it("buildCareerBundleGmailEnrichment accepts fixed generatedAt", () => {
    const preview = buildGmailSyncPreview({ messages: [sampleRecruiterEmail] });
    const enrichment = buildCareerBundleGmailEnrichment(preview.signals, {
      generatedAt: "2026-06-09T12:00:00.000Z",
    });
    expect(enrichment.generatedAt).toBe("2026-06-09T12:00:00.000Z");
  });

  it("rawRetained is always false", () => {
    const preview = buildGmailSyncPreview({ messages: allGmailFixtures });
    const enrichment = buildCareerBundleGmailEnrichment(preview.signals);
    expect(preview.privacy.rawRetained).toBe(false);
    expect(enrichment.rawRetained).toBe(false);
    expect(shouldRetainRawProviderData()).toBe(false);
    for (const signal of preview.signals) {
      expect(signal.rawRetained).toBe(false);
    }
  });
});
