import { describe, expect, it } from "vitest";
import {
  initializeProviderDerivedRuntimeReview,
  markProviderDerivedSelectionReady,
  toggleProviderDerivedSignalSelection,
} from "@/components/dashboard/provider-derived-runtime-review-state";
import { buildProviderDerivedEnrichmentProposal } from "./provider-derived-enrichment-proposal";
import { deriveProviderEnrichmentChangePreviewViewModel } from "./provider-derived-enrichment-change-preview";
import type { ProviderDerivedRuntimeReviewablePreviewResult } from "@/components/dashboard/provider-derived-runtime-review-state";

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

describe("deriveProviderEnrichmentChangePreviewViewModel", () => {
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
