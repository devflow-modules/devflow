import { describe, expect, it } from "vitest";
import type { ApplyFlowApplication } from "@devflow/applyflow-core";
import { deriveDashboardCareerBundleSyncEnrichmentBaseline } from "./derive-dashboard-career-bundle-sync-enrichment-baseline";

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

describe("deriveDashboardCareerBundleSyncEnrichmentBaseline", () => {
  it("returns null when there are no applications", () => {
    expect(
      deriveDashboardCareerBundleSyncEnrichmentBaseline({
        applications: [],
        includeDemoSyncEnrichment: true,
      }),
    ).toBeNull();
  });

  it("returns null when demo sync enrichment is not enabled", () => {
    expect(
      deriveDashboardCareerBundleSyncEnrichmentBaseline({
        applications: [app()],
        includeDemoSyncEnrichment: false,
      }),
    ).toBeNull();
  });

  it("returns validated sync enrichment when demo opt-in is enabled", () => {
    const baseline = deriveDashboardCareerBundleSyncEnrichmentBaseline({
      applications: [app()],
      includeDemoSyncEnrichment: true,
    });

    expect(baseline).not.toBeNull();
    expect(baseline?.source).toBe("sync");
    expect(baseline?.combinedSignals.length).toBeGreaterThan(0);
  });

  it("does not mutate applications input", () => {
    const applications = [app()];
    deriveDashboardCareerBundleSyncEnrichmentBaseline({
      applications,
      includeDemoSyncEnrichment: true,
    });

    expect(applications).toHaveLength(1);
    expect(applications[0]?.id).toBe("app-1");
  });
});
