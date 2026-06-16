import { describe, expect, it } from "vitest";
import type { ApplyFlowApplication } from "@devflow/applyflow-core";
import { buildApplyFlowDemoSyncEnrichment } from "./career-bundle-demo-sync-enrichment";
import { deriveDashboardCareerBundleExportComposition } from "./derive-dashboard-career-bundle-export-composition";

function app(overrides: Partial<ApplyFlowApplication> = {}): ApplyFlowApplication {
  return {
    id: "app-1",
    company: "Acme",
    role: "Engineer",
    status: "saved",
    source: "manual",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("deriveDashboardCareerBundleExportComposition", () => {
  it("returns none source when there are no applications", () => {
    const result = deriveDashboardCareerBundleExportComposition({
      applications: [],
      includeDemoSyncEnrichment: true,
      eligibleProviderEnrichment: buildApplyFlowDemoSyncEnrichment({
        generatedAt: "2026-06-15T12:00:00.000Z",
      }),
    });

    expect(result.sourceKind).toBe("none");
    expect(result.syncEnrichment).toBeNull();
    expect(result.bundle).toBeNull();
  });

  it("uses demo source when demo is enabled and provider enrichment is absent", () => {
    const result = deriveDashboardCareerBundleExportComposition({
      applications: [app()],
      includeDemoSyncEnrichment: true,
      eligibleProviderEnrichment: null,
    });

    expect(result.sourceKind).toBe("demo");
    expect(result.syncEnrichment).not.toBeNull();
    expect(result.bundle).not.toBeNull();
    expect(result.bundle?.syncEnrichment).toBeDefined();
  });

  it("uses provider-derived source when eligible enrichment is present", () => {
    const enrichment = buildApplyFlowDemoSyncEnrichment({
      generatedAt: "2026-06-15T12:00:00.000Z",
      now: "2026-06-15T12:00:00.000Z",
    });

    const result = deriveDashboardCareerBundleExportComposition({
      applications: [app()],
      includeDemoSyncEnrichment: false,
      eligibleProviderEnrichment: enrichment,
    });

    expect(result.sourceKind).toBe("provider-derived-proposal");
    expect(result.syncEnrichment).toEqual(enrichment);
  });

  it("prefers provider-derived over demo", () => {
    const enrichment = buildApplyFlowDemoSyncEnrichment({
      generatedAt: "2026-06-15T12:00:00.000Z",
      now: "2026-06-15T12:00:00.000Z",
    });

    const result = deriveDashboardCareerBundleExportComposition({
      applications: [app()],
      includeDemoSyncEnrichment: true,
      eligibleProviderEnrichment: enrichment,
    });

    expect(result.sourceKind).toBe("provider-derived-proposal");
  });

  it("falls back to demo when eligible provider enrichment is removed", () => {
    const enrichment = buildApplyFlowDemoSyncEnrichment({
      generatedAt: "2026-06-15T12:00:00.000Z",
      now: "2026-06-15T12:00:00.000Z",
    });

    const withProvider = deriveDashboardCareerBundleExportComposition({
      applications: [app()],
      includeDemoSyncEnrichment: true,
      eligibleProviderEnrichment: enrichment,
    });
    expect(withProvider.sourceKind).toBe("provider-derived-proposal");

    const staleFallback = deriveDashboardCareerBundleExportComposition({
      applications: [app()],
      includeDemoSyncEnrichment: true,
      eligibleProviderEnrichment: null,
    });
    expect(staleFallback.sourceKind).toBe("demo");
  });
});
