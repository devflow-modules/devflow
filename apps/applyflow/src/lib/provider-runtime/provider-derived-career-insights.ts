import {
  collectForbiddenKeysInDocument,
  deriveProviderDerivedCareerInsightsMetrics,
  type ProviderConnectionVerificationResult,
  type ProviderDerivedCareerInsightsMetrics,
} from "@devflow/career-sync";
import {
  canExportEnrichmentProposal,
} from "@/lib/provider-runtime/provider-derived-enrichment-proposal-export";
import {
  isEnrichmentProposalStale,
  type ProviderDerivedEnrichmentProposal,
} from "@/lib/provider-runtime/provider-derived-enrichment-proposal";
import type { ProviderDerivedRuntimePreviewUiState } from "@/components/dashboard/provider-derived-runtime-preview-client";
import type { ProviderDerivedRuntimePreviewClientResult } from "@/components/dashboard/provider-derived-runtime-preview-client";
import {
  getReviewableSignals,
  type ProviderDerivedRuntimeReviewState,
} from "@/components/dashboard/provider-derived-runtime-review-state";
import { PROVIDER_DERIVED_CAREER_INSIGHTS_PHASE_MESSAGES } from "@/components/dashboard/provider-derived-career-insights-content";

export type ProviderCareerInsightsPhase =
  | "no_valid_connection"
  | "connected_idle"
  | "preview_loading"
  | "preview_blocked"
  | "preview_error"
  | "preview_without_signals"
  | "preview_partial"
  | "awaiting_review"
  | "review_in_progress"
  | "selection_ready"
  | "proposal_ready"
  | "export_available";

export type ProviderCareerInsightsViewModel = {
  phase: ProviderCareerInsightsPhase;
  safeForClient: true;
  metrics: ProviderDerivedCareerInsightsMetrics | null;
  reviewStatus: ProviderDerivedRuntimeReviewState["reviewStatus"] | null;
  proposalStatus: ProviderDerivedEnrichmentProposal["status"] | null;
  exportAvailable: boolean;
  privacyWarnings: string[];
  appliedToCareerBundle: false;
  appliedToApplications: false;
  persisted: false;
  headline: string;
  messages: string[];
};

export type DeriveProviderCareerInsightsInput = {
  explicitConsentChecked: boolean;
  gmailVerification: ProviderConnectionVerificationResult | null;
  calendarVerification: ProviderConnectionVerificationResult | null;
  previewUiState: ProviderDerivedRuntimePreviewUiState;
  previewResult: ProviderDerivedRuntimePreviewClientResult | null;
  reviewState: ProviderDerivedRuntimeReviewState;
  proposal: ProviderDerivedEnrichmentProposal | null;
};

function isServerVerified(
  verification: ProviderConnectionVerificationResult | null,
): boolean {
  return verification?.state === "connected";
}

function derivePhase(input: DeriveProviderCareerInsightsInput): ProviderCareerInsightsPhase {
  const gmailConnected = isServerVerified(input.gmailVerification);
  const calendarConnected = isServerVerified(input.calendarVerification);

  if (!input.explicitConsentChecked || !gmailConnected || !calendarConnected) {
    return "no_valid_connection";
  }

  if (input.previewUiState === "loading") {
    return "preview_loading";
  }

  if (!input.previewResult) {
    return "connected_idle";
  }

  if (input.previewResult.status === "blocked") {
    return "preview_blocked";
  }

  if (input.previewResult.status === "error") {
    return "preview_error";
  }

  const reviewableCount = getReviewableSignals(
    input.previewResult.signals,
    input.reviewState.dismissedSignalIds,
  ).length;

  if (reviewableCount === 0) {
    return "preview_without_signals";
  }

  if (input.previewResult.status === "partial") {
    if (input.reviewState.reviewStatus === "selection_ready") {
      const isProposalStale = isEnrichmentProposalStale(input.proposal, {
        previewResult: input.previewResult,
        reviewState: input.reviewState,
        isPreviewLoading: false,
      });

      if (
        canExportEnrichmentProposal({
          proposal: input.proposal,
          isProposalStale,
        })
      ) {
        return "export_available";
      }

      if (input.proposal?.status === "ready") {
        return "proposal_ready";
      }

      return "selection_ready";
    }

    if (input.reviewState.reviewStatus === "reviewing") {
      return input.reviewState.selectedSignalIds.length > 0
        ? "review_in_progress"
        : "awaiting_review";
    }

    return "preview_partial";
  }

  if (input.reviewState.reviewStatus === "selection_ready") {
    const isProposalStale = isEnrichmentProposalStale(input.proposal, {
      previewResult: input.previewResult,
      reviewState: input.reviewState,
      isPreviewLoading: false,
    });

    if (
      canExportEnrichmentProposal({
        proposal: input.proposal,
        isProposalStale,
      })
    ) {
      return "export_available";
    }

    if (input.proposal?.status === "ready") {
      return "proposal_ready";
    }

    return "selection_ready";
  }

  if (input.reviewState.reviewStatus === "reviewing") {
    return input.reviewState.selectedSignalIds.length > 0
      ? "review_in_progress"
      : "awaiting_review";
  }

  return "awaiting_review";
}

function collectPrivacyWarnings(input: DeriveProviderCareerInsightsInput): string[] {
  const warnings = new Set<string>();

  for (const warning of input.previewResult?.warnings ?? []) {
    warnings.add(warning);
  }

  for (const warning of input.proposal?.warnings ?? []) {
    warnings.add(warning);
  }

  return [...warnings].sort((left, right) => left.localeCompare(right));
}

/**
 * Deterministic read-only view model for provider-derived career insights.
 * Does not call providers, persist data, or mutate input.
 */
export function deriveProviderCareerInsights(
  input: DeriveProviderCareerInsightsInput,
): ProviderCareerInsightsViewModel {
  const phase = derivePhase(input);
  const signals = input.previewResult?.signals ?? [];

  const metrics =
    phase === "no_valid_connection" ||
    phase === "connected_idle" ||
    phase === "preview_loading" ||
    phase === "preview_blocked" ||
    phase === "preview_error"
      ? null
      : deriveProviderDerivedCareerInsightsMetrics({
          signals,
          selectedSignalIds: input.reviewState.selectedSignalIds,
          dismissedSignalIds: input.reviewState.dismissedSignalIds,
        });

  const isProposalStale = isEnrichmentProposalStale(input.proposal, {
    previewResult: input.previewResult,
    reviewState: input.reviewState,
    isPreviewLoading: input.previewUiState === "loading",
  });

  const exportAvailable = canExportEnrichmentProposal({
    proposal: input.proposal,
    isProposalStale,
  });

  return {
    phase,
    safeForClient: true,
    metrics,
    reviewStatus: input.previewResult ? input.reviewState.reviewStatus : null,
    proposalStatus: input.proposal?.status ?? null,
    exportAvailable,
    privacyWarnings: collectPrivacyWarnings(input),
    appliedToCareerBundle: false,
    appliedToApplications: false,
    persisted: false,
    headline: PROVIDER_DERIVED_CAREER_INSIGHTS_PHASE_MESSAGES[phase],
    messages: [PROVIDER_DERIVED_CAREER_INSIGHTS_PHASE_MESSAGES[phase]],
  };
}

export function assertProviderCareerInsightsViewModelSafe(
  viewModel: ProviderCareerInsightsViewModel,
): void {
  const forbidden = collectForbiddenKeysInDocument(viewModel);

  if (forbidden.length > 0) {
    throw new Error(`forbidden_keys_in_view_model:${forbidden.join(",")}`);
  }
}
