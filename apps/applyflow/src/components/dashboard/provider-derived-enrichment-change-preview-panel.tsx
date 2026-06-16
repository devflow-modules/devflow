"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import type { CareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";
import type { CareerBundleSyncEnrichmentSourceKind } from "@/lib/career-bundle-sync-enrichment-source";
import {
  deriveProviderEnrichmentChangePreviewViewModel,
  formatEnrichmentChangePreviewValue,
  type ProviderEnrichmentChangePreviewViewModel,
} from "@/lib/provider-runtime/provider-derived-enrichment-change-preview";
import type { ProviderDerivedEnrichmentProposal } from "@/lib/provider-runtime/provider-derived-enrichment-proposal";
import type { ProviderDerivedRuntimeReviewState } from "./provider-derived-runtime-review-state";
import {
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_BADGE_NO_APPLY,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_BADGE_READ_ONLY,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_DESCRIPTION,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_MANUAL_REVIEW,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_APPLICATIONS,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_CAREER_BUNDLE,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_STATUS_LABELS,
  PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_TITLE,
} from "./provider-derived-enrichment-change-preview-content";

export type ProviderDerivedEnrichmentChangePreviewPanelProps = {
  currentSyncEnrichment?: CareerBundleUnifiedSyncEnrichment | null;
  baselineSourceKind?: CareerBundleSyncEnrichmentSourceKind;
  proposal: ProviderDerivedEnrichmentProposal | null;
  reviewState: ProviderDerivedRuntimeReviewState;
  exportAvailable: boolean;
};

function renderChangeItems(viewModel: ProviderEnrichmentChangePreviewViewModel) {
  const items = viewModel.preview?.items ?? [];

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2" data-testid="provider-derived-enrichment-change-preview-items">
      {items.map((item) => (
        <div
          key={item.field}
          className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)]/50 bg-[color:var(--af-surface)]/30 p-2"
          data-testid={`provider-derived-enrichment-change-item-${item.field}`}
        >
          <p className="font-medium text-[color:var(--af-text)]">{item.label}</p>
          <p>
            Status:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_STATUS_LABELS[item.status]}
            </span>
          </p>
          <p>
            Current:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {formatEnrichmentChangePreviewValue(item.currentValue)}
            </span>
          </p>
          <p>
            Suggested:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {formatEnrichmentChangePreviewValue(item.suggestedValue)}
            </span>
          </p>
          {item.confidence ? (
            <p>
              Confidence:{" "}
              <span className="font-medium text-[color:var(--af-text)]">{item.confidence}</span>
            </p>
          ) : null}
          {item.warnings.length > 0 ? (
            <ul className="list-inside list-disc text-amber-200/90">
              {item.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ProviderDerivedEnrichmentChangePreviewPanelView({
  viewModel,
}: {
  viewModel: ProviderEnrichmentChangePreviewViewModel;
}) {
  const statusCounts = viewModel.preview?.statusCounts;

  return (
    <ApplyFlowCard
      variant="default"
      padding="sm"
      className="border border-teal-500/25 bg-teal-950/10"
      data-testid="provider-derived-enrichment-change-preview-panel"
    >
      <div className="space-y-3 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-teal-100/95">
            {PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_TITLE}
          </p>
          <ApplyFlowBadge tone="neutral">
            {PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_BADGE_READ_ONLY}
          </ApplyFlowBadge>
          <ApplyFlowBadge tone="neutral">
            {PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_BADGE_NO_APPLY}
          </ApplyFlowBadge>
        </div>

        <p>{PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_DESCRIPTION}</p>

        <ul className="list-inside list-disc space-y-1">
          <li>{PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_CAREER_BUNDLE}</li>
          <li>{PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_APPLICATIONS}</li>
          <li>{PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_MANUAL_REVIEW}</li>
        </ul>

        <p
          role="status"
          aria-live="polite"
          data-testid="provider-derived-enrichment-change-preview-headline"
        >
          {viewModel.headline}
        </p>

        <p
          role="status"
          aria-live="polite"
          data-testid="provider-derived-enrichment-change-preview-baseline-notice"
        >
          {viewModel.baselineNotice}
        </p>

        {statusCounts ? (
          <div
            className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3"
            data-testid="provider-derived-enrichment-change-preview-status-counts"
          >
            {(
              Object.entries(statusCounts) as Array<
                [keyof typeof statusCounts, number]
              >
            )
              .filter(([, count]) => count > 0)
              .map(([status, count]) => (
                <p key={status}>
                  {PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_STATUS_LABELS[status]}:{" "}
                  <span className="font-medium text-[color:var(--af-text)]">{count}</span>
                </p>
              ))}
          </div>
        ) : null}

        {renderChangeItems(viewModel)}
      </div>
    </ApplyFlowCard>
  );
}

/**
 * Read-only preview of suggested sync enrichment changes vs current bundle state.
 * Does not apply, persist, or import data.
 */
export function ProviderDerivedEnrichmentChangePreviewPanel(
  props: ProviderDerivedEnrichmentChangePreviewPanelProps,
) {
  const viewModel = deriveProviderEnrichmentChangePreviewViewModel(props);

  return <ProviderDerivedEnrichmentChangePreviewPanelView viewModel={viewModel} />;
}
