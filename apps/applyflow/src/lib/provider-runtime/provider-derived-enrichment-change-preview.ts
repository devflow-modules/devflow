import type { CareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";
import {
  deriveEnrichmentChangePreview,
  serializeSafeDisplayValue,
  type EnrichmentChangePreviewResult,
  type SafeDisplayValue,
} from "@devflow/career-sync";
import type { CareerBundleSyncEnrichmentSourceKind } from "@/lib/career-bundle-sync-enrichment-source";
import type { ProviderDerivedEnrichmentProposal } from "@/lib/provider-runtime/provider-derived-enrichment-proposal";
import type { ProviderDerivedRuntimeReviewState } from "@/components/dashboard/provider-derived-runtime-review-state";
import {
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_EMPTY_PROPOSAL,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_INVALID_PROPOSAL,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_BASELINE_DEMO,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_BASELINE_PROVIDER_DERIVED,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_BASELINE,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_CHANGES,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_READ_ONLY_MESSAGE,
} from "@/components/dashboard/provider-derived-enrichment-change-preview-content";

export type ProviderEnrichmentChangePreviewUiPhase =
  | "no_proposal"
  | "invalid_proposal"
  | "no_changes"
  | "has_changes"
  | "has_conflicts"
  | "low_confidence"
  | "partially_supported"
  | "export_available"
  | "safe_error";

export type ProviderEnrichmentChangePreviewViewModel = {
  phase: ProviderEnrichmentChangePreviewUiPhase;
  preview: EnrichmentChangePreviewResult | null;
  headline: string;
  hasCurrentBaseline: boolean;
  baselineNotice: string;
  baselineSourceKind: CareerBundleSyncEnrichmentSourceKind;
  safeForClient: true;
  readOnly: true;
  appliedToCareerBundle: false;
  appliedToApplications: false;
  persisted: false;
};

export type DeriveProviderEnrichmentChangePreviewInput = {
  currentSyncEnrichment?: CareerBundleUnifiedSyncEnrichment | null;
  baselineSourceKind?: CareerBundleSyncEnrichmentSourceKind;
  proposal: ProviderDerivedEnrichmentProposal | null;
  reviewState: ProviderDerivedRuntimeReviewState;
  exportAvailable: boolean;
};

function formatDisplayValue(value: SafeDisplayValue): string {
  const serialized = serializeSafeDisplayValue(value);
  if (serialized == null) {
    return "—";
  }

  if (Array.isArray(serialized)) {
    return serialized.length > 0 ? serialized.join(", ") : "—";
  }

  return String(serialized);
}

export function formatEnrichmentChangePreviewValue(value: SafeDisplayValue): string {
  return formatDisplayValue(value);
}

function deriveUiPhase(input: {
  proposal: ProviderDerivedEnrichmentProposal | null;
  preview: EnrichmentChangePreviewResult | null;
  exportAvailable: boolean;
}): ProviderEnrichmentChangePreviewUiPhase {
  if (!input.proposal || input.proposal.status === "idle") {
    return "no_proposal";
  }

  if (input.proposal.status !== "ready" || !input.proposal.enrichment || !input.preview) {
    return "invalid_proposal";
  }

  if (input.exportAvailable) {
    return "export_available";
  }

  if (input.preview.status === "invalid") {
    return "safe_error";
  }

  const { statusCounts, items } = input.preview;

  if (statusCounts.conflict > 0) {
    return "has_conflicts";
  }

  if (statusCounts.insufficient_confidence > 0) {
    return "low_confidence";
  }

  if (statusCounts.unsupported > 0 && items.some((item) => item.status !== "unsupported")) {
    return "partially_supported";
  }

  const hasChanges = items.some(
    (item) =>
      item.status !== "unchanged" &&
      item.status !== "unsupported" &&
      item.status !== "excluded_by_user",
  );

  if (!hasChanges) {
    return "no_changes";
  }

  return "has_changes";
}

function deriveHeadline(phase: ProviderEnrichmentChangePreviewUiPhase): string {
  switch (phase) {
    case "no_proposal":
      return PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_EMPTY_PROPOSAL;
    case "invalid_proposal":
      return PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_INVALID_PROPOSAL;
    case "no_changes":
      return PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_CHANGES;
    case "safe_error":
      return PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_INVALID_PROPOSAL;
    default:
      return PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_READ_ONLY_MESSAGE;
  }
}

function deriveBaselineNotice(
  hasCurrentBaseline: boolean,
  sourceKind: CareerBundleSyncEnrichmentSourceKind,
): string {
  if (!hasCurrentBaseline) {
    return PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_BASELINE;
  }

  switch (sourceKind) {
    case "provider-derived-proposal":
      return PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_BASELINE_PROVIDER_DERIVED;
    case "demo":
      return PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_BASELINE_DEMO;
    case "none":
    default:
      return PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_BASELINE;
  }
}

export function deriveProviderEnrichmentChangePreviewViewModel(
  input: DeriveProviderEnrichmentChangePreviewInput,
): ProviderEnrichmentChangePreviewViewModel {
  const preview =
    input.proposal?.status === "ready" && input.proposal.enrichment
      ? deriveEnrichmentChangePreview({
          current: input.currentSyncEnrichment ?? null,
          proposed: input.proposal.enrichment,
          excludedSignalIds: input.reviewState.dismissedSignalIds,
        })
      : null;

  const phase = deriveUiPhase({
    proposal: input.proposal,
    preview,
    exportAvailable: input.exportAvailable,
  });

  const hasCurrentBaseline = input.currentSyncEnrichment != null;
  const baselineSourceKind = input.baselineSourceKind ?? "none";
  const baselineNotice = deriveBaselineNotice(hasCurrentBaseline, baselineSourceKind);

  return {
    phase,
    preview,
    headline: deriveHeadline(phase),
    hasCurrentBaseline,
    baselineNotice,
    baselineSourceKind,
    safeForClient: true,
    readOnly: true,
    appliedToCareerBundle: false,
    appliedToApplications: false,
    persisted: false,
  };
}
