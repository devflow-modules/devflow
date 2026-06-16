import { validateCareerBundleSyncEnrichment } from "@devflow/career-core";
import type { CareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";
import type { ProviderDerivedRuntimeReviewState } from "@/components/dashboard/provider-derived-runtime-review-state";
import type { ProviderDerivedRuntimeReviewablePreviewResult } from "@/components/dashboard/provider-derived-runtime-review-state";
import {
  isEnrichmentProposalStale,
  type ProviderDerivedEnrichmentProposal,
} from "@/lib/provider-runtime/provider-derived-enrichment-proposal";

export type DeriveEligibleProviderEnrichmentForExportInput = {
  proposal: ProviderDerivedEnrichmentProposal | null;
  previewResult: ProviderDerivedRuntimeReviewablePreviewResult | null;
  reviewState: ProviderDerivedRuntimeReviewState;
  isPreviewLoading: boolean;
};

/**
 * Derives eligible provider-derived sync enrichment for transient export composition.
 * Returns null when the proposal is missing, stale, invalid, or fails canonical validation.
 */
export function deriveEligibleProviderEnrichmentForExport(
  input: DeriveEligibleProviderEnrichmentForExportInput,
): CareerBundleUnifiedSyncEnrichment | null {
  const { proposal } = input;

  if (proposal == null) {
    return null;
  }

  if (
    isEnrichmentProposalStale(proposal, {
      previewResult: input.previewResult,
      reviewState: input.reviewState,
      isPreviewLoading: input.isPreviewLoading,
    })
  ) {
    return null;
  }

  if (proposal.status !== "ready" || !proposal.enrichment) {
    return null;
  }

  if (
    proposal.persisted !== false ||
    proposal.appliedToCareerBundle !== false ||
    proposal.appliedToApplications !== false ||
    proposal.userReviewRequired !== true ||
    proposal.selectedSignalIds.length === 0
  ) {
    return null;
  }

  const validation = validateCareerBundleSyncEnrichment(proposal.enrichment);
  if (validation.status !== "provided" || !validation.syncEnrichment) {
    return null;
  }

  return validation.syncEnrichment;
}
