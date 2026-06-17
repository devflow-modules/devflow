"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  buildProviderInsightsTimelineSummaryView,
  filterProviderInsightsSignals,
  groupProviderInsightsSignalsByDay,
  PROVIDER_INSIGHTS_TIMELINE_FILTERS,
  resolveProviderInsightsTimelineViewState,
  type ProviderInsightsTimelineFilter,
} from "@/lib/provider-runtime/provider-insights-timeline";
import { useMemo, useState } from "react";
import type { ProviderDerivedRuntimePreviewClientResult } from "./provider-derived-runtime-preview-client";
import type { ProviderDerivedRuntimePreviewUiState } from "./provider-derived-runtime-preview-client";
import {
  PROVIDER_INSIGHTS_TIMELINE_BADGE_IN_MEMORY,
  PROVIDER_INSIGHTS_TIMELINE_BADGE_NO_AUTO,
  PROVIDER_INSIGHTS_TIMELINE_BADGE_READ_ONLY,
  PROVIDER_INSIGHTS_TIMELINE_DESCRIPTION,
  PROVIDER_INSIGHTS_TIMELINE_DISCLAIMER,
  PROVIDER_INSIGHTS_TIMELINE_EMPTY_BLOCKED,
  PROVIDER_INSIGHTS_TIMELINE_EMPTY_FILTER,
  PROVIDER_INSIGHTS_TIMELINE_EMPTY_NO_PREVIEW,
  PROVIDER_INSIGHTS_TIMELINE_EMPTY_ZERO_SIGNALS,
  PROVIDER_INSIGHTS_TIMELINE_FILTER_LABEL,
  PROVIDER_INSIGHTS_TIMELINE_FILTER_LABELS,
  PROVIDER_INSIGHTS_TIMELINE_FILTERED_COUNT_LABEL,
  PROVIDER_INSIGHTS_TIMELINE_SUMMARY_TITLE,
  PROVIDER_INSIGHTS_TIMELINE_TITLE,
} from "./provider-insights-timeline-content";
import { ProviderInsightsTimelineSignalCard } from "./provider-insights-timeline-signal-card";

export type ProviderInsightsTimelineProps = {
  previewUiState: ProviderDerivedRuntimePreviewUiState;
  previewResult: ProviderDerivedRuntimePreviewClientResult | null;
  isPreviewLoading: boolean;
};

function renderSummary(summary: ReturnType<typeof buildProviderInsightsTimelineSummaryView>) {
  return (
    <div
      className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)]/60 bg-[color:var(--af-surface)]/40 p-3 sm:grid-cols-3"
      data-testid="provider-insights-timeline-summary"
    >
      <p>
        Total: <span className="font-medium text-[color:var(--af-text)]">{summary.total}</span>
      </p>
      <p>
        Gmail: <span className="font-medium text-[color:var(--af-text)]">{summary.gmail}</span>
      </p>
      <p>
        Calendar:{" "}
        <span className="font-medium text-[color:var(--af-text)]">{summary.calendar}</span>
      </p>
      <p>
        Correlation:{" "}
        <span className="font-medium text-[color:var(--af-text)]">{summary.correlation}</span>
      </p>
      <p>
        Low confidence:{" "}
        <span className="font-medium text-[color:var(--af-text)]">{summary.lowConfidence}</span>
      </p>
      <p>
        Review required:{" "}
        <span className="font-medium text-[color:var(--af-text)]">{summary.reviewRequired}</span>
      </p>
    </div>
  );
}

export function ProviderInsightsTimelineView({
  previewUiState,
  previewResult,
  isPreviewLoading,
  activeFilter,
  onFilterChange,
}: ProviderInsightsTimelineProps & {
  activeFilter: ProviderInsightsTimelineFilter;
  onFilterChange: (filter: ProviderInsightsTimelineFilter) => void;
}) {
  const signals = previewResult?.signals ?? [];
  const filteredSignals = useMemo(
    () => filterProviderInsightsSignals(signals, activeFilter),
    [signals, activeFilter],
  );
  const dayGroups = useMemo(
    () => groupProviderInsightsSignalsByDay(filteredSignals),
    [filteredSignals],
  );
  const viewState = resolveProviderInsightsTimelineViewState({
    previewUiState,
    previewStatus: previewResult?.status,
    totalSignals: signals.length,
    filteredCount: filteredSignals.length,
  });
  const summaryView = previewResult
    ? buildProviderInsightsTimelineSummaryView(previewResult.summary)
    : buildProviderInsightsTimelineSummaryView({
        totalSignals: 0,
        gmailSignalCount: 0,
        calendarSignalCount: 0,
        correlationSignalCount: 0,
        lowConfidenceSignalCount: 0,
        reviewRequiredCount: 0,
        companies: [],
        kinds: [],
        hasInterviewSignal: false,
        hasPendingActionSignal: false,
        hasOfferSignal: false,
        hasRejectionSignal: false,
      });

  const emptyMessage =
    viewState === "no_preview"
      ? PROVIDER_INSIGHTS_TIMELINE_EMPTY_NO_PREVIEW
      : viewState === "blocked"
        ? PROVIDER_INSIGHTS_TIMELINE_EMPTY_BLOCKED
        : viewState === "zero_signals"
          ? PROVIDER_INSIGHTS_TIMELINE_EMPTY_ZERO_SIGNALS
          : viewState === "filter_empty"
            ? PROVIDER_INSIGHTS_TIMELINE_EMPTY_FILTER
            : null;

  return (
    <ApplyFlowCard
      variant="default"
      padding="sm"
      className="border border-cyan-500/25 bg-cyan-950/10"
      data-testid="provider-insights-timeline-panel"
    >
      <div className="space-y-3 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-semibold text-cyan-100/95">{PROVIDER_INSIGHTS_TIMELINE_TITLE}</h3>
          <ApplyFlowBadge tone="neutral">{PROVIDER_INSIGHTS_TIMELINE_BADGE_READ_ONLY}</ApplyFlowBadge>
          <ApplyFlowBadge tone="intel">{PROVIDER_INSIGHTS_TIMELINE_BADGE_IN_MEMORY}</ApplyFlowBadge>
          <ApplyFlowBadge tone="neutral">{PROVIDER_INSIGHTS_TIMELINE_BADGE_NO_AUTO}</ApplyFlowBadge>
        </div>

        <p>{PROVIDER_INSIGHTS_TIMELINE_DESCRIPTION}</p>

        <p data-testid="provider-insights-timeline-disclaimer">{PROVIDER_INSIGHTS_TIMELINE_DISCLAIMER}</p>

        {previewResult ? (
          <>
            <p className="font-medium text-[color:var(--af-text)]">
              {PROVIDER_INSIGHTS_TIMELINE_SUMMARY_TITLE}
            </p>
            {renderSummary(summaryView)}
          </>
        ) : null}

        <div className="space-y-2">
          <p id="provider-insights-timeline-filter-label" className="font-medium text-[color:var(--af-text)]">
            {PROVIDER_INSIGHTS_TIMELINE_FILTER_LABEL}
          </p>
          <div
            role="tablist"
            aria-labelledby="provider-insights-timeline-filter-label"
            className="flex flex-wrap gap-2"
            data-testid="provider-insights-timeline-filters"
          >
            {PROVIDER_INSIGHTS_TIMELINE_FILTERS.map((filter) => {
              const selected = activeFilter === filter;
              return (
                <ApplyFlowButton
                  key={filter}
                  type="button"
                  role="tab"
                  variant={selected ? "primary" : "outlineBrand"}
                  size="sm"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  aria-label={`${PROVIDER_INSIGHTS_TIMELINE_FILTER_LABELS[filter]} filter`}
                  disabled={isPreviewLoading}
                  onClick={() => onFilterChange(filter)}
                  onKeyDown={(event) => {
                    const index = PROVIDER_INSIGHTS_TIMELINE_FILTERS.indexOf(filter);
                    if (event.key === "ArrowRight") {
                      event.preventDefault();
                      const next =
                        PROVIDER_INSIGHTS_TIMELINE_FILTERS[
                          (index + 1) % PROVIDER_INSIGHTS_TIMELINE_FILTERS.length
                        ];
                      onFilterChange(next);
                    }
                    if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      const next =
                        PROVIDER_INSIGHTS_TIMELINE_FILTERS[
                          (index - 1 + PROVIDER_INSIGHTS_TIMELINE_FILTERS.length) %
                            PROVIDER_INSIGHTS_TIMELINE_FILTERS.length
                        ];
                      onFilterChange(next);
                    }
                  }}
                  data-testid={`provider-insights-timeline-filter-${filter}`}
                >
                  {PROVIDER_INSIGHTS_TIMELINE_FILTER_LABELS[filter]}
                </ApplyFlowButton>
              );
            })}
          </div>
          <p data-testid="provider-insights-timeline-filtered-count" aria-live="polite">
            {PROVIDER_INSIGHTS_TIMELINE_FILTERED_COUNT_LABEL}:{" "}
            <span className="font-medium text-[color:var(--af-text)]">{filteredSignals.length}</span>
          </p>
        </div>

        {emptyMessage ? (
          <p role="status" aria-live="polite" data-testid="provider-insights-timeline-empty-message">
            {emptyMessage}
          </p>
        ) : null}

        {viewState === "signals_available" ? (
          <div className="space-y-4" data-testid="provider-insights-timeline-groups">
            {dayGroups.map((group) => (
              <section
                key={group.dayKey}
                aria-label={`Signals on ${group.label}`}
                data-testid={`provider-insights-timeline-day-${group.dayKey}`}
              >
                <h4 className="mb-2 text-xs font-semibold text-[color:var(--af-text)]">{group.label}</h4>
                <div className="space-y-2 border-l border-cyan-500/30 pl-3">
                  {group.signals.map((signal) => (
                    <ProviderInsightsTimelineSignalCard key={signal.id} signal={signal} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </ApplyFlowCard>
  );
}

/**
 * Read-only consolidated timeline for in-memory provider-derived signals.
 * Does not call providers, persist data, or apply changes automatically.
 */
export function ProviderInsightsTimeline(props: ProviderInsightsTimelineProps) {
  const [activeFilter, setActiveFilter] = useState<ProviderInsightsTimelineFilter>("all");

  return (
    <ProviderInsightsTimelineView
      {...props}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
    />
  );
}
