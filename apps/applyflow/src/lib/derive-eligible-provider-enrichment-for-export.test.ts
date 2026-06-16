import { describe, expect, it } from "vitest";
import {
  initializeProviderDerivedRuntimeReview,
  markProviderDerivedSelectionReady,
  toggleProviderDerivedSignalSelection,
  type ProviderDerivedRuntimeReviewablePreviewResult,
} from "@/components/dashboard/provider-derived-runtime-review-state";
import { buildProviderDerivedEnrichmentProposal } from "@/lib/provider-runtime/provider-derived-enrichment-proposal";
import { deriveEligibleProviderEnrichmentForExport } from "./derive-eligible-provider-enrichment-for-export";

const generatedAt = "2026-06-15T12:00:00.000Z";

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

function readyContext() {
  const previewResult = previewWithSignals();
  let reviewState = initializeProviderDerivedRuntimeReview(previewResult);
  reviewState = toggleProviderDerivedSignalSelection(
    reviewState,
    previewResult.signals[0]!.id,
    previewResult.signals,
  );
  reviewState = markProviderDerivedSelectionReady(reviewState);
  const proposal = buildProviderDerivedEnrichmentProposal({
    previewResult,
    reviewState,
    generatedAt,
  });

  return { previewResult, reviewState, proposal };
}

describe("deriveEligibleProviderEnrichmentForExport", () => {
  it("returns null when proposal is missing", () => {
    const { previewResult, reviewState } = readyContext();

    expect(
      deriveEligibleProviderEnrichmentForExport({
        proposal: null,
        previewResult,
        reviewState,
        isPreviewLoading: false,
      }),
    ).toBeNull();
  });

  it("returns validated enrichment for ready proposal", () => {
    const { previewResult, reviewState, proposal } = readyContext();

    const enrichment = deriveEligibleProviderEnrichmentForExport({
      proposal,
      previewResult,
      reviewState,
      isPreviewLoading: false,
    });

    expect(enrichment).not.toBeNull();
    expect(enrichment?.source).toBe("sync");
  });

  it("returns null for stale proposal when selection changes", () => {
    const { previewResult, reviewState, proposal } = readyContext();
    const changedReview = {
      ...reviewState,
      selectedSignalIds: [],
    };

    expect(
      deriveEligibleProviderEnrichmentForExport({
        proposal,
        previewResult,
        reviewState: changedReview,
        isPreviewLoading: false,
      }),
    ).toBeNull();
  });

  it("returns null when proposal is not ready", () => {
    const { previewResult, reviewState } = readyContext();

    expect(
      deriveEligibleProviderEnrichmentForExport({
        proposal: {
          status: "invalid",
          sourcePreviewFingerprint: "fp",
          selectedSignalIds: [],
          sourceSignalCount: 0,
          warnings: ["review_not_ready"],
          messages: [],
          safeForClient: true,
          ephemeral: true,
          userReviewRequired: true,
          persisted: false,
          appliedToCareerBundle: false,
          appliedToApplications: false,
        },
        previewResult,
        reviewState,
        isPreviewLoading: false,
      }),
    ).toBeNull();
  });

  it("does not mutate proposal input", () => {
    const { previewResult, reviewState, proposal } = readyContext();
    const before = JSON.stringify(proposal);

    deriveEligibleProviderEnrichmentForExport({
      proposal,
      previewResult,
      reviewState,
      isPreviewLoading: false,
    });

    expect(JSON.stringify(proposal)).toBe(before);
  });
});
