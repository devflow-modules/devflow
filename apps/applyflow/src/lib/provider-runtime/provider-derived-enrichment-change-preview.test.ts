import { describe, expect, it } from "vitest";
import {
  initializeProviderDerivedRuntimeReview,
  markProviderDerivedSelectionReady,
  toggleProviderDerivedSignalSelection,
} from "@/components/dashboard/provider-derived-runtime-review-state";
import { buildProviderDerivedEnrichmentProposal } from "./provider-derived-enrichment-proposal";
import { deriveProviderEnrichmentChangePreviewViewModel } from "./provider-derived-enrichment-change-preview";
import type { ProviderDerivedRuntimeReviewablePreviewResult } from "@/components/dashboard/provider-derived-runtime-review-state";
import {
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_BASELINE_AVAILABLE,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_BASELINE,
} from "@/components/dashboard/provider-derived-enrichment-change-preview-content";
import { buildApplyFlowDemoSyncEnrichment } from "@/lib/career-bundle-demo-sync-enrichment";
import type { ProviderDerivedEnrichmentProposal } from "./provider-derived-enrichment-proposal";
import { deriveDashboardCareerBundleSyncEnrichmentBaseline } from "@/lib/derive-dashboard-career-bundle-sync-enrichment-baseline";
import type { ApplyFlowApplication } from "@devflow/applyflow-core";

function previewWithSignals(): ProviderDerivedRuntimeReviewablePreviewResult {
  return {
    status: "completed",
    processedMessageCount: 1,
    processedEventCount: 0,
    signals: [
      {
        id: "provider-signal-gmail-follow_up_required-2026-06-12T10-00-00-000Z-001",
        source: "gmail",
        kind: "follow_up_required",
        occurredAt: "2026-06-12T10:00:00.000Z",
        confidence: 0.9,
        reviewRequired: true,
        sourceCount: 1,
        company: "Acme",
      },
    ],
  };
}

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

function readyProposalWithEnrichment(
  enrichment: NonNullable<ProviderDerivedEnrichmentProposal["enrichment"]>,
): ProviderDerivedEnrichmentProposal {
  return {
    status: "ready",
    sourcePreviewFingerprint: "fp-1",
    selectedSignalIds: ["signal-1"],
    sourceSignalCount: 1,
    generatedAt: "2026-06-15T12:00:00.000Z",
    enrichment,
    warnings: [],
    messages: [],
    safeForClient: true,
    ephemeral: true,
    userReviewRequired: true,
    persisted: false,
    appliedToCareerBundle: false,
    appliedToApplications: false,
  };
}

describe("deriveProviderEnrichmentChangePreviewViewModel", () => {
  it("reports no baseline when currentSyncEnrichment is omitted", () => {
    const viewModel = deriveProviderEnrichmentChangePreviewViewModel({
      proposal: null,
      reviewState: initializeProviderDerivedRuntimeReview(previewWithSignals()),
      exportAvailable: false,
    });

    expect(viewModel.hasCurrentBaseline).toBe(false);
    expect(viewModel.baselineNotice).toBe(PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_BASELINE);
  });

  it("reports baseline available when currentSyncEnrichment is provided", () => {
    const enrichment = buildApplyFlowDemoSyncEnrichment({
      generatedAt: "2026-06-15T12:00:00.000Z",
      now: "2026-06-15T12:00:00.000Z",
    });

    const viewModel = deriveProviderEnrichmentChangePreviewViewModel({
      currentSyncEnrichment: enrichment,
      proposal: readyProposalWithEnrichment(enrichment),
      reviewState: initializeProviderDerivedRuntimeReview(previewWithSignals()),
      exportAvailable: false,
    });

    expect(viewModel.hasCurrentBaseline).toBe(true);
    expect(viewModel.baselineNotice).toBe(PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_BASELINE_AVAILABLE);
    expect(viewModel.phase).toBe("no_changes");
  });

  it("uses dashboard baseline helper output as currentSyncEnrichment", () => {
    const baseline = deriveDashboardCareerBundleSyncEnrichmentBaseline({
      applications: [app()],
      includeDemoSyncEnrichment: true,
    });

    expect(baseline).not.toBeNull();

    const viewModel = deriveProviderEnrichmentChangePreviewViewModel({
      currentSyncEnrichment: baseline,
      proposal: readyProposalWithEnrichment(baseline!),
      reviewState: initializeProviderDerivedRuntimeReview(previewWithSignals()),
      exportAvailable: false,
    });

    expect(viewModel.hasCurrentBaseline).toBe(true);
    expect(viewModel.preview?.statusCounts.unchanged).toBeGreaterThan(0);
  });

  it("returns no_proposal when proposal is missing", () => {
    const viewModel = deriveProviderEnrichmentChangePreviewViewModel({
      proposal: null,
      reviewState: initializeProviderDerivedRuntimeReview(previewWithSignals()),
      exportAvailable: false,
    });

    expect(viewModel.phase).toBe("no_proposal");
    expect(viewModel.appliedToCareerBundle).toBe(false);
  });

  it("returns has_changes for ready proposal without current enrichment", () => {
    const preview = previewWithSignals();
    let reviewState = initializeProviderDerivedRuntimeReview(preview);
    reviewState = toggleProviderDerivedSignalSelection(
      reviewState,
      preview.signals[0]!.id,
      preview.signals,
    );
    reviewState = markProviderDerivedSelectionReady(reviewState);
    const proposal = buildProviderDerivedEnrichmentProposal({
      previewResult: preview,
      reviewState,
      generatedAt: "2026-06-15T12:00:00.000Z",
    });

    const viewModel = deriveProviderEnrichmentChangePreviewViewModel({
      proposal,
      reviewState,
      exportAvailable: proposal.status === "ready",
    });

    expect(["has_changes", "export_available", "low_confidence"]).toContain(viewModel.phase);
    expect(viewModel.preview?.items.length).toBeGreaterThan(0);
  });
});
