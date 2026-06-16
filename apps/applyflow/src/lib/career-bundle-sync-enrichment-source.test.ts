import { describe, expect, it } from "vitest";
import { buildApplyFlowDemoSyncEnrichment } from "./career-bundle-demo-sync-enrichment";
import { resolveCareerBundleSyncEnrichmentSource } from "./career-bundle-sync-enrichment-source";

describe("resolveCareerBundleSyncEnrichmentSource", () => {
  it("returns none when no eligible provider enrichment and demo is off", () => {
    expect(
      resolveCareerBundleSyncEnrichmentSource({
        includeDemoSyncEnrichment: false,
        eligibleProviderEnrichment: null,
      }),
    ).toEqual({ kind: "none" });
  });

  it("returns demo when demo is enabled and no provider enrichment", () => {
    expect(
      resolveCareerBundleSyncEnrichmentSource({
        includeDemoSyncEnrichment: true,
        eligibleProviderEnrichment: null,
      }),
    ).toEqual({ kind: "demo" });
  });

  it("prefers provider-derived over demo when both are available", () => {
    const enrichment = buildApplyFlowDemoSyncEnrichment({
      generatedAt: "2026-06-15T12:00:00.000Z",
      now: "2026-06-15T12:00:00.000Z",
    });

    const source = resolveCareerBundleSyncEnrichmentSource({
      includeDemoSyncEnrichment: true,
      eligibleProviderEnrichment: enrichment,
    });

    expect(source.kind).toBe("provider-derived-proposal");
    if (source.kind === "provider-derived-proposal") {
      expect(source.enrichment).toEqual(enrichment);
    }
  });
});
