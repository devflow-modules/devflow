import type { CareerBundleUnifiedSyncEnrichment, ProviderDerivedSignal } from "@devflow/career-sync";
import {
  adaptProviderDerivedSignalsToSyncEnrichment,
  createSelectedSignalsComposition,
  sortProviderDerivedSignals,
} from "@devflow/career-sync";
import {
  createProviderDerivedPreviewFingerprint,
  isProviderDerivedSignalReviewable,
  type ProviderDerivedRuntimeReviewState,
  type ProviderDerivedRuntimeReviewablePreviewResult,
} from "@/components/dashboard/provider-derived-runtime-review-state";

export type ProviderDerivedEnrichmentProposalStatus = "idle" | "ready" | "invalid" | "error";

export type ProviderDerivedEnrichmentProposal = {
  status: ProviderDerivedEnrichmentProposalStatus;
  sourcePreviewFingerprint: string;
  selectedSignalIds: string[];
  safeForClient: true;
  ephemeral: true;
  userReviewRequired: true;
  persisted: false;
  appliedToCareerBundle: false;
  appliedToApplications: false;
  sourceSignalCount: number;
  generatedAt?: string;
  enrichment?: CareerBundleUnifiedSyncEnrichment;
  warnings: string[];
  messages: string[];
};

export type BuildProviderDerivedEnrichmentProposalInput = {
  previewResult: ProviderDerivedRuntimeReviewablePreviewResult;
  reviewState: ProviderDerivedRuntimeReviewState;
  generatedAt: string;
};

const INVALID_MESSAGE =
  "The selected signals are not ready for an enrichment proposal.";
const ERROR_MESSAGE = "The enrichment proposal could not be built safely.";
const READY_MESSAGE =
  "Enrichment proposal was built from the selected signals. Nothing has been saved or applied.";

function sortUniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

function createProposalSafetyFlags(): Pick<
  ProviderDerivedEnrichmentProposal,
  | "safeForClient"
  | "ephemeral"
  | "userReviewRequired"
  | "persisted"
  | "appliedToCareerBundle"
  | "appliedToApplications"
> {
  return {
    safeForClient: true,
    ephemeral: true,
    userReviewRequired: true,
    persisted: false,
    appliedToCareerBundle: false,
    appliedToApplications: false,
  };
}

function createInvalidProposal(input: {
  warnings: string[];
  reviewState: ProviderDerivedRuntimeReviewState;
  previewResult: ProviderDerivedRuntimeReviewablePreviewResult;
}): ProviderDerivedEnrichmentProposal {
  return {
    status: "invalid",
    sourcePreviewFingerprint:
      input.reviewState.sourcePreviewFingerprint ??
      createProviderDerivedPreviewFingerprint(input.previewResult),
    selectedSignalIds: sortUniqueIds(input.reviewState.selectedSignalIds),
    sourceSignalCount: 0,
    warnings: input.warnings,
    messages: [INVALID_MESSAGE],
    ...createProposalSafetyFlags(),
  };
}

function createErrorProposal(input: {
  warnings: string[];
  reviewState: ProviderDerivedRuntimeReviewState;
  previewResult: ProviderDerivedRuntimeReviewablePreviewResult;
  selectedSignalIds: string[];
}): ProviderDerivedEnrichmentProposal {
  return {
    status: "error",
    sourcePreviewFingerprint:
      input.reviewState.sourcePreviewFingerprint ??
      createProviderDerivedPreviewFingerprint(input.previewResult),
    selectedSignalIds: input.selectedSignalIds,
    sourceSignalCount: input.selectedSignalIds.length,
    warnings: input.warnings,
    messages: [ERROR_MESSAGE],
    ...createProposalSafetyFlags(),
  };
}

export function validateReviewSelectionForProposal(
  input: BuildProviderDerivedEnrichmentProposalInput,
): string[] {
  const warnings: string[] = [];
  const { previewResult, reviewState } = input;

  if (reviewState.reviewStatus !== "selection_ready") {
    warnings.push("review_not_ready");
  }

  if (previewResult.status === "blocked" || previewResult.status === "error") {
    warnings.push("preview_not_ready");
  }

  const fingerprint = createProviderDerivedPreviewFingerprint(previewResult);
  if (
    reviewState.sourcePreviewFingerprint == null ||
    reviewState.sourcePreviewFingerprint !== fingerprint
  ) {
    warnings.push("preview_fingerprint_mismatch");
  }

  const uniqueSelectedIds = sortUniqueIds(reviewState.selectedSignalIds);
  if (uniqueSelectedIds.length === 0) {
    warnings.push("no_selected_signals");
  }

  const signalById = new Map(previewResult.signals.map((signal) => [signal.id, signal]));
  const dismissedIds = new Set(reviewState.dismissedSignalIds);

  for (const signalId of uniqueSelectedIds) {
    if (dismissedIds.has(signalId)) {
      warnings.push("selected_signal_dismissed");
      continue;
    }

    const signal = signalById.get(signalId);
    if (!signal) {
      warnings.push("selected_signal_not_found");
      continue;
    }

    if (!isProviderDerivedSignalReviewable(signal)) {
      warnings.push("selected_signal_not_reviewable");
    }
  }

  return warnings;
}

export function selectProviderDerivedSignalsForProposal(
  previewSignals: readonly ProviderDerivedSignal[],
  reviewState: ProviderDerivedRuntimeReviewState,
): ProviderDerivedSignal[] {
  const uniqueSelectedIds = sortUniqueIds(reviewState.selectedSignalIds);
  const signalById = new Map(
    previewSignals
      .filter(isProviderDerivedSignalReviewable)
      .map((signal) => [signal.id, signal]),
  );
  const dismissedIds = new Set(reviewState.dismissedSignalIds);

  const selected = uniqueSelectedIds
    .filter((signalId) => !dismissedIds.has(signalId))
    .map((signalId) => signalById.get(signalId))
    .filter((signal): signal is ProviderDerivedSignal => signal != null);

  return sortProviderDerivedSignals(selected);
}

export function buildProviderDerivedEnrichmentProposal(
  input: BuildProviderDerivedEnrichmentProposalInput,
): ProviderDerivedEnrichmentProposal {
  const validationWarnings = validateReviewSelectionForProposal(input);

  if (validationWarnings.length > 0) {
    return createInvalidProposal({
      warnings: validationWarnings,
      reviewState: input.reviewState,
      previewResult: input.previewResult,
    });
  }

  const selectedSignalIds = sortUniqueIds(input.reviewState.selectedSignalIds);
  const selectedSignals = selectProviderDerivedSignalsForProposal(
    input.previewResult.signals,
    input.reviewState,
  );

  if (selectedSignals.length === 0) {
    return createInvalidProposal({
      warnings: ["no_selected_signals"],
      reviewState: input.reviewState,
      previewResult: input.previewResult,
    });
  }

  const composition = createSelectedSignalsComposition(selectedSignals);
  const adapted = adaptProviderDerivedSignalsToSyncEnrichment({
    composition,
    generatedAt: input.generatedAt,
  });

  if (adapted.status === "completed" && adapted.enrichment) {
    return {
      status: "ready",
      sourcePreviewFingerprint: input.reviewState.sourcePreviewFingerprint!,
      selectedSignalIds,
      sourceSignalCount: selectedSignals.length,
      generatedAt: input.generatedAt,
      enrichment: adapted.enrichment,
      warnings: adapted.warnings,
      messages: [READY_MESSAGE, ...adapted.messages],
      ...createProposalSafetyFlags(),
    };
  }

  return createErrorProposal({
    warnings: adapted.warnings.length > 0 ? adapted.warnings : ["adapted_sync_enrichment_build_failed"],
    reviewState: input.reviewState,
    previewResult: input.previewResult,
    selectedSignalIds,
  });
}

export function canBuildEnrichmentProposal(input: {
  previewResult: ProviderDerivedRuntimeReviewablePreviewResult | null;
  reviewState: ProviderDerivedRuntimeReviewState;
  isPreviewLoading: boolean;
}): boolean {
  if (input.isPreviewLoading || input.previewResult == null) {
    return false;
  }

  if (input.previewResult.status !== "completed" && input.previewResult.status !== "partial") {
    return false;
  }

  if (input.reviewState.reviewStatus !== "selection_ready") {
    return false;
  }

  if (input.reviewState.selectedSignalIds.length === 0) {
    return false;
  }

  if (input.reviewState.sourcePreviewFingerprint == null) {
    return false;
  }

  return (
    input.reviewState.sourcePreviewFingerprint ===
    createProviderDerivedPreviewFingerprint(input.previewResult)
  );
}

export function isEnrichmentProposalStale(
  proposal: ProviderDerivedEnrichmentProposal | null,
  input: {
    previewResult: ProviderDerivedRuntimeReviewablePreviewResult | null;
    reviewState: ProviderDerivedRuntimeReviewState;
    isPreviewLoading: boolean;
  },
): boolean {
  if (proposal == null || proposal.status === "idle") {
    return false;
  }

  if (input.isPreviewLoading) {
    return true;
  }

  if (
    !input.previewResult ||
    input.previewResult.status === "blocked" ||
    input.previewResult.status === "error"
  ) {
    return true;
  }

  if (input.reviewState.reviewStatus !== "selection_ready") {
    return true;
  }

  const fingerprint = createProviderDerivedPreviewFingerprint(input.previewResult);
  if (proposal.sourcePreviewFingerprint !== fingerprint) {
    return true;
  }

  const currentSelectedIds = sortUniqueIds(input.reviewState.selectedSignalIds);
  if (proposal.selectedSignalIds.join("\0") !== currentSelectedIds.join("\0")) {
    return true;
  }

  return false;
}
