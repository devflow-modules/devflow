import { describe, expect, it } from "vitest";
import type { ApplyFlowApplication } from "@devflow/applyflow-core";
import {
  createCareerBundleHandshakeMessage,
  parseCareerBundleWithSyncEnrichment,
} from "@devflow/career-core";
import { buildApplyFlowDemoSyncEnrichment } from "./career-bundle-demo-sync-enrichment";
import {
  stringifyInterviewLabCareerBundleExport,
} from "./career-bundle-export";
import { deriveDashboardCareerBundleExportComposition } from "./derive-dashboard-career-bundle-export-composition";
import { careerBundleExportsStructurallyEqual } from "./normalize-career-bundle-export-for-comparison";

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

describe("CareerBundle export session consistency", () => {
  it("uses the same bundle for composition, handoff message, and download serialization", () => {
    const applications = [app()];
    const composition = deriveDashboardCareerBundleExportComposition({
      applications,
      includeDemoSyncEnrichment: true,
      eligibleProviderEnrichment: null,
    });

    expect(composition.bundle).not.toBeNull();
    expect(composition.sourceKind).toBe("demo");

    const handoffMessage = createCareerBundleHandshakeMessage(composition.bundle!);
    expect(handoffMessage.type).toBe("devflow.careerBundle.v1");

    const downloadJson = stringifyInterviewLabCareerBundleExport(composition.bundle!);
    const handoffBundle = handoffMessage.payload as typeof composition.bundle;
    expect(careerBundleExportsStructurallyEqual(composition.bundle!, handoffBundle!)).toBe(true);
    expect(stringifyInterviewLabCareerBundleExport(handoffBundle!)).toBe(downloadJson);

    expect(composition.syncEnrichment).toEqual(composition.bundle!.syncEnrichment);
  });

  it("preserves provider-derived sync enrichment in handoff payload", () => {
    const enrichment = buildApplyFlowDemoSyncEnrichment({
      generatedAt: "2026-06-15T12:00:00.000Z",
      now: "2026-06-15T12:00:00.000Z",
    });

    const composition = deriveDashboardCareerBundleExportComposition({
      applications: [app()],
      includeDemoSyncEnrichment: false,
      eligibleProviderEnrichment: enrichment,
    });

    expect(composition.sourceKind).toBe("provider-derived-proposal");
    expect(composition.bundle).not.toBeNull();

    const handoffMessage = createCareerBundleHandshakeMessage(composition.bundle!);
    const parsed = parseCareerBundleWithSyncEnrichment(handoffMessage.payload);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.syncEnrichmentStatus).toBe("provided");
      expect(parsed.data.syncEnrichment).toEqual(enrichment);
    }

    const serialized = JSON.stringify(handoffMessage);
    expect(serialized).not.toMatch(/selectedSignalIds|sourcePreviewFingerprint|reviewState/i);
    expect(serialized).not.toMatch(/access_token|connectionId|threadId|snippet/i);
  });

  it("handoff without enrichment does not include syncEnrichment", () => {
    const composition = deriveDashboardCareerBundleExportComposition({
      applications: [app()],
      includeDemoSyncEnrichment: false,
      eligibleProviderEnrichment: null,
    });

    const handoffMessage = createCareerBundleHandshakeMessage(composition.bundle!);
    expect(handoffMessage.payload).not.toHaveProperty("syncEnrichment");
  });
});
