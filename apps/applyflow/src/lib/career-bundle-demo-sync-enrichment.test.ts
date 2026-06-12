import { validateCareerBundleSyncEnrichment } from "@devflow/career-core";
import { describe, expect, it } from "vitest";
import { buildApplyFlowDemoSyncEnrichment } from "./career-bundle-demo-sync-enrichment.js";

const FIXED_NOW = "2026-06-09T12:00:00.000Z";

describe("buildApplyFlowDemoSyncEnrichment", () => {
  it("returns enrichment that passes career-core privacy validation", () => {
    const enrichment = buildApplyFlowDemoSyncEnrichment({ generatedAt: FIXED_NOW, now: FIXED_NOW });
    const result = validateCareerBundleSyncEnrichment(enrichment);
    expect(result.status).toBe("provided");
    expect(result.syncEnrichment?.source).toBe("sync");
  });

  it("does not include raw email, calendar description, provider payloads, or meeting links", () => {
    const enrichment = buildApplyFlowDemoSyncEnrichment({ generatedAt: FIXED_NOW, now: FIXED_NOW });
    const serialized = JSON.stringify(enrichment);
    expect(serialized).not.toMatch(/threadId/i);
    expect(serialized).not.toMatch(/"snippet"/);
    expect(serialized).not.toMatch(/"description"/);
    expect(serialized).not.toMatch(/hangoutLink|htmlLink|meet\.google\.com|zoom\.us|teams\.microsoft/i);
    for (const signal of enrichment.combinedSignals) {
      expect(signal.rawRetained).toBe(false);
      expect(signal.safeSummary).not.toMatch(/https?:\/\//);
    }
  });

  it("uses sandbox fixture signals with aggregated stats", () => {
    const enrichment = buildApplyFlowDemoSyncEnrichment({ generatedAt: FIXED_NOW, now: FIXED_NOW });
    expect(enrichment.stats.totalSignals).toBeGreaterThan(0);
    expect(enrichment.privacy.rawRetained).toBe(false);
    expect(enrichment.privacy.providerPayloadRetained).toBe(false);
    expect(enrichment.privacy.meetingLinksRemoved).toBe(true);
  });
});
