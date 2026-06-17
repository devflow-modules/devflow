"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import type { ProviderDerivedSignal } from "@devflow/career-sync";
import { useEffect, useState } from "react";
import type { ProviderDerivedRuntimePreviewClientResult } from "./provider-derived-runtime-preview-client";
import {
  PROVIDER_DERIVED_RUNTIME_REVIEW_BADGE_IN_MEMORY,
  PROVIDER_DERIVED_RUNTIME_REVIEW_BADGE_MANUAL,
  PROVIDER_DERIVED_RUNTIME_REVIEW_BADGE_NO_AUTO,
  PROVIDER_DERIVED_RUNTIME_REVIEW_CLEAR_SELECTION_LABEL,
  PROVIDER_DERIVED_RUNTIME_REVIEW_DESCRIPTION,
  PROVIDER_DERIVED_RUNTIME_REVIEW_SIGNALS_DISCLAIMER,
  PROVIDER_DERIVED_RUNTIME_REVIEW_EMPTY_ALL_DISMISSED,
  PROVIDER_DERIVED_RUNTIME_REVIEW_EMPTY_NO_PREVIEW,
  PROVIDER_DERIVED_RUNTIME_REVIEW_EMPTY_NO_SIGNALS,
  PROVIDER_DERIVED_RUNTIME_REVIEW_MARK_READY_LABEL,
  PROVIDER_DERIVED_RUNTIME_REVIEW_PARTIAL_WARNING,
  PROVIDER_DERIVED_RUNTIME_REVIEW_SELECT_ALL_LABEL,
  PROVIDER_DERIVED_RUNTIME_REVIEW_SELECTION_READY_MESSAGE,
  PROVIDER_DERIVED_RUNTIME_REVIEW_TITLE,
} from "./provider-derived-runtime-review-content";
import {
  clearProviderDerivedSignalSelection,
  dismissProviderDerivedSignal,
  getDismissedSignals,
  getReviewableSignals,
  markProviderDerivedSelectionReady,
  restoreDismissedProviderDerivedSignal,
  selectAllReviewableProviderDerivedSignals,
  syncReviewStateWithPreview,
  toggleProviderDerivedSignalSelection,
  type ProviderDerivedRuntimeReviewState,
} from "./provider-derived-runtime-review-state";
import { ProviderDerivedRuntimeSignalCard } from "./provider-derived-runtime-signal-card";

export type ProviderDerivedRuntimeReviewPanelProps = {
  result: ProviderDerivedRuntimePreviewClientResult | null;
  isPreviewLoading: boolean;
  onReviewStateChange?: (state: ProviderDerivedRuntimeReviewState) => void;
};

function reviewEmptyMessage(input: {
  result: ProviderDerivedRuntimePreviewClientResult | null;
  reviewableCount: number;
  dismissedCount: number;
}): string {
  if (!input.result || input.result.status === "blocked" || input.result.status === "error") {
    return PROVIDER_DERIVED_RUNTIME_REVIEW_EMPTY_NO_PREVIEW;
  }

  if (input.reviewableCount === 0 && input.dismissedCount === 0) {
    return PROVIDER_DERIVED_RUNTIME_REVIEW_EMPTY_NO_SIGNALS;
  }

  if (input.reviewableCount === 0 && input.dismissedCount > 0) {
    return PROVIDER_DERIVED_RUNTIME_REVIEW_EMPTY_ALL_DISMISSED;
  }

  return PROVIDER_DERIVED_RUNTIME_REVIEW_EMPTY_NO_PREVIEW;
}

export function ProviderDerivedRuntimeReviewPanelView({
  result,
  isPreviewLoading,
  reviewState,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onDismiss,
  onRestore,
  onMarkSelectionReady,
}: {
  result: ProviderDerivedRuntimePreviewClientResult | null;
  isPreviewLoading: boolean;
  reviewState: ProviderDerivedRuntimeReviewState;
  onToggleSelection: (signalId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDismiss: (signalId: string) => void;
  onRestore: (signalId: string) => void;
  onMarkSelectionReady: () => void;
}) {
  const signals = result?.signals ?? [];
  const reviewableSignals = getReviewableSignals(signals, reviewState.dismissedSignalIds);
  const dismissedSignals = getDismissedSignals(signals, reviewState.dismissedSignalIds);
  const canReview =
    !isPreviewLoading &&
    result != null &&
    (result.status === "completed" || result.status === "partial");
  const markReadyEnabled =
    canReview &&
    reviewState.selectedSignalIds.length > 0 &&
    reviewState.sourcePreviewFingerprint != null;

  return (
    <ApplyFlowCard
      variant="default"
      padding="sm"
      className="border border-violet-500/25 bg-violet-950/10"
      data-testid="provider-derived-runtime-review-panel"
    >
      <div className="space-y-3 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-violet-100/95">
            {PROVIDER_DERIVED_RUNTIME_REVIEW_TITLE}
          </p>
          <ApplyFlowBadge tone="neutral">{PROVIDER_DERIVED_RUNTIME_REVIEW_BADGE_IN_MEMORY}</ApplyFlowBadge>
          <ApplyFlowBadge tone="intel">{PROVIDER_DERIVED_RUNTIME_REVIEW_BADGE_MANUAL}</ApplyFlowBadge>
          <ApplyFlowBadge tone="neutral">{PROVIDER_DERIVED_RUNTIME_REVIEW_BADGE_NO_AUTO}</ApplyFlowBadge>
        </div>

        <p>{PROVIDER_DERIVED_RUNTIME_REVIEW_DESCRIPTION}</p>
        <p data-testid="provider-derived-runtime-review-signals-disclaimer">
          {PROVIDER_DERIVED_RUNTIME_REVIEW_SIGNALS_DISCLAIMER}
        </p>

        {result?.status === "partial" && canReview ? (
          <p
            className="text-amber-200/90"
            role="status"
            aria-live="polite"
            data-testid="provider-derived-runtime-review-partial-warning"
          >
            {PROVIDER_DERIVED_RUNTIME_REVIEW_PARTIAL_WARNING}
          </p>
        ) : null}

        {reviewState.reviewStatus === "selection_ready" ? (
          <div
            role="status"
            aria-live="polite"
            data-testid="provider-derived-runtime-review-selection-ready"
            className="space-y-1 rounded-[var(--af-radius-sm)] border border-emerald-500/30 bg-emerald-950/20 p-2"
          >
            <p>
              Selected signals:{" "}
              <span className="font-medium text-[color:var(--af-text)]">
                {reviewState.selectedSignalIds.length}
              </span>
            </p>
            <p>
              Dismissed signals:{" "}
              <span className="font-medium text-[color:var(--af-text)]">
                {reviewState.dismissedSignalIds.length}
              </span>
            </p>
            <p>{PROVIDER_DERIVED_RUNTIME_REVIEW_SELECTION_READY_MESSAGE}</p>
          </div>
        ) : null}

        {!canReview || reviewableSignals.length === 0 ? (
          <p data-testid="provider-derived-runtime-review-empty-message" role="status" aria-live="polite">
            {reviewEmptyMessage({
              result,
              reviewableCount: reviewableSignals.length,
              dismissedCount: dismissedSignals.length,
            })}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <ApplyFlowButton
                type="button"
                variant="outlineBrand"
                size="sm"
                onClick={onSelectAll}
                data-testid="provider-derived-runtime-review-select-all"
              >
                {PROVIDER_DERIVED_RUNTIME_REVIEW_SELECT_ALL_LABEL}
              </ApplyFlowButton>
              <ApplyFlowButton
                type="button"
                variant="outlineBrand"
                size="sm"
                onClick={onClearSelection}
                data-testid="provider-derived-runtime-review-clear-selection"
              >
                {PROVIDER_DERIVED_RUNTIME_REVIEW_CLEAR_SELECTION_LABEL}
              </ApplyFlowButton>
              <ApplyFlowButton
                type="button"
                variant="outlineBrand"
                size="sm"
                disabled={!markReadyEnabled}
                onClick={onMarkSelectionReady}
                data-testid="provider-derived-runtime-review-mark-ready"
              >
                {PROVIDER_DERIVED_RUNTIME_REVIEW_MARK_READY_LABEL}
              </ApplyFlowButton>
            </div>

            <div className="space-y-2" data-testid="provider-derived-runtime-review-signal-list">
              {reviewableSignals.map((signal) => (
                <ProviderDerivedRuntimeSignalCard
                  key={signal.id}
                  signal={signal}
                  selected={reviewState.selectedSignalIds.includes(signal.id)}
                  dismissed={false}
                  checkboxId={`provider-derived-runtime-signal-${signal.id}`}
                  onToggleSelection={onToggleSelection}
                  onDismiss={onDismiss}
                />
              ))}
            </div>
          </>
        )}

        {dismissedSignals.length > 0 ? (
          <div className="space-y-2" data-testid="provider-derived-runtime-review-dismissed-list">
            <p className="font-medium text-[color:var(--af-text)]">Dismissed signals</p>
            {dismissedSignals.map((signal) => (
              <ProviderDerivedRuntimeSignalCard
                key={signal.id}
                signal={signal}
                selected={false}
                dismissed={true}
                checkboxId={`provider-derived-runtime-signal-dismissed-${signal.id}`}
                onRestore={onRestore}
              />
            ))}
          </div>
        ) : null}
      </div>
    </ApplyFlowCard>
  );
}

/**
 * In-memory review workflow for client-safe provider-derived runtime signals.
 * Does not persist, call providers, or apply changes automatically.
 */
export function ProviderDerivedRuntimeReviewPanel({
  result,
  isPreviewLoading,
  onReviewStateChange,
}: ProviderDerivedRuntimeReviewPanelProps) {
  const [reviewState, setReviewState] = useState<ProviderDerivedRuntimeReviewState>(() =>
    syncReviewStateWithPreview(
      {
        sourcePreviewFingerprint: null,
        selectedSignalIds: [],
        dismissedSignalIds: [],
        reviewStatus: "idle",
      },
      { result, isPreviewLoading },
    ),
  );

  useEffect(() => {
    setReviewState((previous) => syncReviewStateWithPreview(previous, { result, isPreviewLoading }));
  }, [result, isPreviewLoading]);

  useEffect(() => {
    onReviewStateChange?.(reviewState);
  }, [onReviewStateChange, reviewState]);

  return (
    <ProviderDerivedRuntimeReviewPanelView
      result={result}
      isPreviewLoading={isPreviewLoading}
      reviewState={reviewState}
      onToggleSelection={(signalId) => {
        setReviewState((previous) =>
          toggleProviderDerivedSignalSelection(previous, signalId, result?.signals ?? []),
        );
      }}
      onSelectAll={() => {
        setReviewState((previous) =>
          selectAllReviewableProviderDerivedSignals(previous, result?.signals ?? []),
        );
      }}
      onClearSelection={() => {
        setReviewState((previous) => clearProviderDerivedSignalSelection(previous));
      }}
      onDismiss={(signalId) => {
        setReviewState((previous) =>
          dismissProviderDerivedSignal(previous, signalId, result?.signals ?? []),
        );
      }}
      onRestore={(signalId) => {
        setReviewState((previous) => restoreDismissedProviderDerivedSignal(previous, signalId));
      }}
      onMarkSelectionReady={() => {
        setReviewState((previous) => markProviderDerivedSelectionReady(previous));
      }}
    />
  );
}
