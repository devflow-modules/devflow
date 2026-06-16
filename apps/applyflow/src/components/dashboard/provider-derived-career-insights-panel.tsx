"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  deriveProviderCareerInsights,
  type ProviderCareerInsightsViewModel,
} from "@/lib/provider-runtime/provider-derived-career-insights";
import type { ProviderDerivedEnrichmentProposal } from "@/lib/provider-runtime/provider-derived-enrichment-proposal";
import type { ProviderDerivedRuntimePreviewUiState } from "./provider-derived-runtime-preview-client";
import type { ProviderDerivedRuntimePreviewClientResult } from "./provider-derived-runtime-preview-client";
import type { ProviderDerivedRuntimeReviewState } from "./provider-derived-runtime-review-state";
import type { ProviderConnectionVerificationResult } from "@devflow/career-sync";
import {
  PROVIDER_DERIVED_CAREER_INSIGHTS_BADGE_DERIVED,
  PROVIDER_DERIVED_CAREER_INSIGHTS_BADGE_NO_AUTO,
  PROVIDER_DERIVED_CAREER_INSIGHTS_BADGE_READ_ONLY,
  PROVIDER_DERIVED_CAREER_INSIGHTS_DESCRIPTION,
  PROVIDER_DERIVED_CAREER_INSIGHTS_MANUAL_REVIEW,
  PROVIDER_DERIVED_CAREER_INSIGHTS_NO_APPLICATIONS,
  PROVIDER_DERIVED_CAREER_INSIGHTS_NO_CAREER_BUNDLE,
  PROVIDER_DERIVED_CAREER_INSIGHTS_NO_PERSISTENCE,
  PROVIDER_DERIVED_CAREER_INSIGHTS_TITLE,
} from "./provider-derived-career-insights-content";

export type ProviderDerivedCareerInsightsPanelProps = {
  explicitConsentChecked: boolean;
  gmailVerification: ProviderConnectionVerificationResult | null;
  calendarVerification: ProviderConnectionVerificationResult | null;
  previewUiState: ProviderDerivedRuntimePreviewUiState;
  previewResult: ProviderDerivedRuntimePreviewClientResult | null;
  reviewState: ProviderDerivedRuntimeReviewState;
  proposal: ProviderDerivedEnrichmentProposal | null;
};

function renderMetrics(viewModel: ProviderCareerInsightsViewModel) {
  const metrics = viewModel.metrics;

  if (!metrics) {
    return null;
  }

  return (
    <div
      className="space-y-2 rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)]/60 bg-[color:var(--af-surface)]/40 p-3"
      data-testid="provider-derived-career-insights-metrics"
    >
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
        <p>
          Available:{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {metrics.reviewableSignals}
          </span>
        </p>
        <p>
          Selected:{" "}
          <span className="font-medium text-[color:var(--af-text)]">{metrics.selectedCount}</span>
        </p>
        <p>
          Unselected:{" "}
          <span className="font-medium text-[color:var(--af-text)]">{metrics.unselectedCount}</span>
        </p>
        <p>
          Dismissed:{" "}
          <span className="font-medium text-[color:var(--af-text)]">{metrics.dismissedCount}</span>
        </p>
        <p>
          Gmail:{" "}
          <span className="font-medium text-[color:var(--af-text)]">{metrics.gmailCount}</span>
        </p>
        <p>
          Calendar:{" "}
          <span className="font-medium text-[color:var(--af-text)]">{metrics.calendarCount}</span>
        </p>
      </div>

      {metrics.averageConfidence != null ? (
        <p>
          Average confidence:{" "}
          <span className="font-medium text-[color:var(--af-text)]">{metrics.averageConfidence}</span>
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-x-3 gap-y-1">
        <p>
          High confidence:{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {metrics.confidenceBuckets.high}
          </span>
        </p>
        <p>
          Medium confidence:{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {metrics.confidenceBuckets.medium}
          </span>
        </p>
        <p>
          Low confidence:{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {metrics.confidenceBuckets.low}
          </span>
        </p>
      </div>

      {metrics.kindCounts.length > 0 ? (
        <div data-testid="provider-derived-career-insights-kind-distribution">
          <p className="font-medium text-[color:var(--af-text)]">Signal kinds</p>
          <ul className="list-inside list-disc space-y-1">
            {metrics.kindCounts.map((entry) => (
              <li key={entry.kind}>
                {entry.kind}: {entry.count}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {metrics.companies.length > 0 ? (
        <p>
          Companies (derived hints):{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {metrics.companies.join(", ")}
          </span>
        </p>
      ) : null}
    </div>
  );
}

export function ProviderDerivedCareerInsightsPanelView({
  viewModel,
}: {
  viewModel: ProviderCareerInsightsViewModel;
}) {
  return (
    <ApplyFlowCard
      variant="default"
      padding="sm"
      className="border border-amber-500/25 bg-amber-950/10"
      data-testid="provider-derived-career-insights-panel"
    >
      <div className="space-y-3 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-amber-100/95">
            {PROVIDER_DERIVED_CAREER_INSIGHTS_TITLE}
          </p>
          <ApplyFlowBadge tone="neutral">{PROVIDER_DERIVED_CAREER_INSIGHTS_BADGE_READ_ONLY}</ApplyFlowBadge>
          <ApplyFlowBadge tone="intel">{PROVIDER_DERIVED_CAREER_INSIGHTS_BADGE_DERIVED}</ApplyFlowBadge>
          <ApplyFlowBadge tone="neutral">{PROVIDER_DERIVED_CAREER_INSIGHTS_BADGE_NO_AUTO}</ApplyFlowBadge>
        </div>

        <p>{PROVIDER_DERIVED_CAREER_INSIGHTS_DESCRIPTION}</p>

        <ul className="list-inside list-disc space-y-1">
          <li>{PROVIDER_DERIVED_CAREER_INSIGHTS_MANUAL_REVIEW}</li>
          <li>{PROVIDER_DERIVED_CAREER_INSIGHTS_NO_CAREER_BUNDLE}</li>
          <li>{PROVIDER_DERIVED_CAREER_INSIGHTS_NO_APPLICATIONS}</li>
          <li>{PROVIDER_DERIVED_CAREER_INSIGHTS_NO_PERSISTENCE}</li>
        </ul>

        <p
          role="status"
          aria-live="polite"
          data-testid="provider-derived-career-insights-headline"
        >
          {viewModel.headline}
        </p>

        {viewModel.reviewStatus ? (
          <p data-testid="provider-derived-career-insights-review-status">
            Review status:{" "}
            <span className="font-medium text-[color:var(--af-text)]">{viewModel.reviewStatus}</span>
          </p>
        ) : null}

        {viewModel.proposalStatus ? (
          <p data-testid="provider-derived-career-insights-proposal-status">
            Proposal status:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {viewModel.proposalStatus}
            </span>
          </p>
        ) : null}

        <p data-testid="provider-derived-career-insights-export-status">
          Export available:{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {viewModel.exportAvailable ? "yes" : "no"}
          </span>
        </p>

        {renderMetrics(viewModel)}

        {viewModel.privacyWarnings.length > 0 ? (
          <ul
            className="list-inside list-disc space-y-1 text-amber-200/90"
            data-testid="provider-derived-career-insights-warnings"
          >
            {viewModel.privacyWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </ApplyFlowCard>
  );
}

/**
 * Read-only career insights from in-memory provider-derived signals.
 * Does not call providers, persist data, or apply changes automatically.
 */
export function ProviderDerivedCareerInsightsPanel(props: ProviderDerivedCareerInsightsPanelProps) {
  const viewModel = deriveProviderCareerInsights(props);

  return <ProviderDerivedCareerInsightsPanelView viewModel={viewModel} />;
}
