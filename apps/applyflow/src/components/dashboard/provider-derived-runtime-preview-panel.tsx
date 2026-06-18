"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import type { CareerBundle } from "@devflow/career-core";
import type { CareerBundleUnifiedSyncEnrichment, ProviderConnectionVerificationResult } from "@devflow/career-sync";
import { useEffect, useState } from "react";
import { deriveEligibleProviderEnrichmentForExport } from "@/lib/derive-eligible-provider-enrichment-for-export";
import type { CareerBundleSyncEnrichmentSourceKind } from "@/lib/career-bundle-sync-enrichment-source";
import { isEnrichmentProposalStale, type ProviderDerivedEnrichmentProposal } from "@/lib/provider-runtime/provider-derived-enrichment-proposal";
import { ProviderDerivedEnrichmentProposalPanel } from "./provider-derived-enrichment-proposal-panel";
import {
  createInitialProviderDerivedRuntimeReviewState,
  type ProviderDerivedRuntimeReviewState,
} from "./provider-derived-runtime-review-state";
import {
  runProviderDerivedRuntimePreview,
  type ProviderDerivedRuntimePreviewClientResult,
  type ProviderDerivedRuntimePreviewUiState,
} from "./provider-derived-runtime-preview-client";
import {
  PROVIDER_DERIVED_RUNTIME_PREVIEW_BADGE,
  PROVIDER_DERIVED_RUNTIME_PREVIEW_BUTTON_LABEL,
  PROVIDER_DERIVED_RUNTIME_PREVIEW_EPHEMERAL,
  PROVIDER_DERIVED_RUNTIME_PREVIEW_NO_CAREER_BUNDLE,
  PROVIDER_DERIVED_RUNTIME_PREVIEW_NO_RAW_DATA,
  PROVIDER_DERIVED_RUNTIME_PREVIEW_REVIEW_REQUIRED,
  PROVIDER_DERIVED_RUNTIME_PREVIEW_TITLE,
  PROVIDER_DERIVED_RUNTIME_PREVIEW_UI_MESSAGES,
} from "./provider-derived-runtime-preview-content";
import { ProviderDerivedRuntimeReviewPanel } from "./provider-derived-runtime-review-panel";
import { ProviderDerivedCareerInsightsPanel } from "./provider-derived-career-insights-panel";
import { ProviderInsightsTimeline } from "./provider-insights-timeline";
import { CareerAgentWorkspace } from "./career-agent-workspace";
import { CareerChatWorkspace } from "./career-chat-workspace";
import { CareerAiDraft } from "./career-ai-draft";

export type { ProviderDerivedRuntimePreviewUiState } from "./provider-derived-runtime-preview-client";

function isGmailServerVerified(
  verification: ProviderConnectionVerificationResult | null,
): boolean {
  return verification?.state === "connected";
}

function isCalendarServerVerified(
  verification: ProviderConnectionVerificationResult | null,
): boolean {
  return verification?.state === "connected";
}

function mapResultToUiState(
  result: ProviderDerivedRuntimePreviewClientResult,
): Exclude<ProviderDerivedRuntimePreviewUiState, "idle" | "loading"> {
  switch (result.status) {
    case "completed":
      return "completed";
    case "partial":
      return "partial";
    case "blocked":
      return "blocked";
    case "error":
      return "error";
  }
}

function uiMessageForState(state: ProviderDerivedRuntimePreviewUiState): string {
  switch (state) {
    case "completed":
      return PROVIDER_DERIVED_RUNTIME_PREVIEW_UI_MESSAGES.completed;
    case "partial":
      return PROVIDER_DERIVED_RUNTIME_PREVIEW_UI_MESSAGES.partial;
    case "blocked":
      return PROVIDER_DERIVED_RUNTIME_PREVIEW_UI_MESSAGES.blocked;
    case "error":
      return PROVIDER_DERIVED_RUNTIME_PREVIEW_UI_MESSAGES.error;
    case "idle":
    case "loading":
    default:
      return PROVIDER_DERIVED_RUNTIME_PREVIEW_UI_MESSAGES.idle;
  }
}

/**
 * Explicitly triggered read-only runtime preview panel.
 * Client-side connection state controls button availability only.
 * The server independently verifies both provider connections.
 * Uses React local state only — no browser persistence.
 */

export function ProviderDerivedRuntimePreviewPanel({
  explicitConsentChecked,
  gmailVerification,
  calendarVerification,
  currentSyncEnrichment = null,
  baselineSourceKind = "none",
  onEligibleProviderEnrichmentChange,
  careerBundle = null,
}: {
  explicitConsentChecked: boolean;
  gmailVerification: ProviderConnectionVerificationResult | null;
  calendarVerification: ProviderConnectionVerificationResult | null;
  currentSyncEnrichment?: CareerBundleUnifiedSyncEnrichment | null;
  baselineSourceKind?: CareerBundleSyncEnrichmentSourceKind;
  onEligibleProviderEnrichmentChange?: (enrichment: CareerBundleUnifiedSyncEnrichment | null) => void;
  careerBundle?: CareerBundle | null;
}) {
  const [uiState, setUiState] = useState<ProviderDerivedRuntimePreviewUiState>("idle");
  const [previewResult, setPreviewResult] =
    useState<ProviderDerivedRuntimePreviewClientResult | null>(null);
  const [reviewState, setReviewState] = useState<ProviderDerivedRuntimeReviewState>(
    createInitialProviderDerivedRuntimeReviewState,
  );
  const [enrichmentProposal, setEnrichmentProposal] =
    useState<ProviderDerivedEnrichmentProposal | null>(null);

  const gmailVerified = isGmailServerVerified(gmailVerification);
  const calendarVerified = isCalendarServerVerified(calendarVerification);

  const previewEnabled =
    explicitConsentChecked && gmailVerified && calendarVerified && uiState !== "loading";

  useEffect(() => {
    setPreviewResult(null);
    setUiState("idle");
    setReviewState(createInitialProviderDerivedRuntimeReviewState());
    setEnrichmentProposal(null);
  }, [
    explicitConsentChecked,
    gmailVerification?.state,
    gmailVerification?.checkedAt,
    calendarVerification?.state,
    calendarVerification?.checkedAt,
  ]);

  useEffect(() => {
    if (
      isEnrichmentProposalStale(enrichmentProposal, {
        previewResult,
        reviewState,
        isPreviewLoading: uiState === "loading",
      })
    ) {
      setEnrichmentProposal(null);
    }
  }, [enrichmentProposal, previewResult, reviewState, uiState]);

  useEffect(() => {
    if (!onEligibleProviderEnrichmentChange) {
      return;
    }

    onEligibleProviderEnrichmentChange(
      deriveEligibleProviderEnrichmentForExport({
        proposal: enrichmentProposal,
        previewResult,
        reviewState,
        isPreviewLoading: uiState === "loading",
      }),
    );
  }, [
    enrichmentProposal,
    previewResult,
    reviewState,
    uiState,
    onEligibleProviderEnrichmentChange,
  ]);

  async function handleRunPreview() {
    if (!previewEnabled) {
      return;
    }

    setUiState("loading");
    setPreviewResult(null);
    setEnrichmentProposal(null);

    const outcome = await runProviderDerivedRuntimePreview({
      explicitConsentChecked,
      gmailConnectionVerified: gmailVerified,
      calendarConnectionVerified: calendarVerified,
    });

    if (!outcome.ok) {
      setUiState("error");
      return;
    }

    setPreviewResult(outcome.result);
    setUiState(mapResultToUiState(outcome.result));
  }

  return (
    <ApplyFlowCard
      variant="default"
      padding="sm"
      className="border border-emerald-500/25 bg-emerald-950/10"
      data-testid="provider-derived-runtime-preview-panel"
    >
      <div className="space-y-3 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-emerald-100/95">
            {PROVIDER_DERIVED_RUNTIME_PREVIEW_TITLE}
          </p>
          <ApplyFlowBadge tone="intel">{PROVIDER_DERIVED_RUNTIME_PREVIEW_BADGE}</ApplyFlowBadge>
          <ApplyFlowBadge tone="neutral">{PROVIDER_DERIVED_RUNTIME_PREVIEW_EPHEMERAL}</ApplyFlowBadge>
        </div>

        <ul className="list-inside list-disc space-y-1">
          <li>{PROVIDER_DERIVED_RUNTIME_PREVIEW_REVIEW_REQUIRED}</li>
          <li>{PROVIDER_DERIVED_RUNTIME_PREVIEW_NO_RAW_DATA}</li>
          <li>{PROVIDER_DERIVED_RUNTIME_PREVIEW_NO_CAREER_BUNDLE}</li>
        </ul>

        <ApplyFlowButton
          type="button"
          variant="outlineBrand"
          size="sm"
          disabled={!previewEnabled}
          onClick={() => {
            void handleRunPreview();
          }}
          data-testid="provider-derived-runtime-preview-button"
        >
          {uiState === "loading" ? "Running preview…" : PROVIDER_DERIVED_RUNTIME_PREVIEW_BUTTON_LABEL}
        </ApplyFlowButton>

        <p data-testid="provider-derived-runtime-preview-status-message">
          {uiMessageForState(uiState)}
        </p>

        {previewResult ? (
          <div
            className="space-y-2 rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)]/60 bg-[color:var(--af-surface)]/40 p-3"
            data-testid="provider-derived-runtime-preview-summary"
          >
            <p>
              Status:{" "}
              <span className="font-medium text-[color:var(--af-text)]">{previewResult.status}</span>
            </p>
            <p>
              Processed messages:{" "}
              <span className="font-medium text-[color:var(--af-text)]">
                {previewResult.processedMessageCount}
              </span>
            </p>
            <p>
              Processed events:{" "}
              <span className="font-medium text-[color:var(--af-text)]">
                {previewResult.processedEventCount}
              </span>
            </p>
            <p>
              Total signals:{" "}
              <span className="font-medium text-[color:var(--af-text)]">
                {previewResult.summary.totalSignals}
              </span>
            </p>
            <p>
              Gmail signals:{" "}
              <span className="font-medium text-[color:var(--af-text)]">
                {previewResult.summary.gmailSignalCount}
              </span>
            </p>
            <p>
              Calendar signals:{" "}
              <span className="font-medium text-[color:var(--af-text)]">
                {previewResult.summary.calendarSignalCount}
              </span>
            </p>
            {previewResult.summary.companies.length > 0 ? (
              <p>
                Companies:{" "}
                <span className="font-medium text-[color:var(--af-text)]">
                  {previewResult.summary.companies.join(", ")}
                </span>
              </p>
            ) : null}
            {previewResult.summary.kinds.length > 0 ? (
              <p>
                Kinds:{" "}
                <span className="font-medium text-[color:var(--af-text)]">
                  {previewResult.summary.kinds.join(", ")}
                </span>
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <p>
                Interview signal:{" "}
                <span className="font-medium text-[color:var(--af-text)]">
                  {previewResult.summary.hasInterviewSignal ? "yes" : "no"}
                </span>
              </p>
              <p>
                Pending action:{" "}
                <span className="font-medium text-[color:var(--af-text)]">
                  {previewResult.summary.hasPendingActionSignal ? "yes" : "no"}
                </span>
              </p>
              <p>
                Offer signal:{" "}
                <span className="font-medium text-[color:var(--af-text)]">
                  {previewResult.summary.hasOfferSignal ? "yes" : "no"}
                </span>
              </p>
              <p>
                Rejection signal:{" "}
                <span className="font-medium text-[color:var(--af-text)]">
                  {previewResult.summary.hasRejectionSignal ? "yes" : "no"}
                </span>
              </p>
            </div>
            {previewResult.warnings.length > 0 ? (
              <ul
                className="list-inside list-disc space-y-1 text-amber-200/90"
                data-testid="provider-derived-runtime-preview-warnings"
              >
                {previewResult.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <ProviderDerivedRuntimeReviewPanel
          result={previewResult}
          isPreviewLoading={uiState === "loading"}
          onReviewStateChange={setReviewState}
        />

        <ProviderInsightsTimeline
          previewUiState={uiState}
          previewResult={previewResult}
          isPreviewLoading={uiState === "loading"}
        />

        <CareerAgentWorkspace
          careerBundle={careerBundle}
          selectedSignalIds={reviewState.selectedSignalIds}
          availableSignals={previewResult?.signals ?? []}
        />

        <CareerChatWorkspace
          careerBundle={careerBundle}
          selectedSignalIds={reviewState.selectedSignalIds}
          availableSignals={previewResult?.signals ?? []}
        />

        <CareerAiDraft
          careerBundle={careerBundle}
          selectedSignalIds={reviewState.selectedSignalIds}
          availableSignals={previewResult?.signals ?? []}
        />

        <ProviderDerivedEnrichmentProposalPanel
          previewResult={previewResult}
          reviewState={reviewState}
          isPreviewLoading={uiState === "loading"}
          proposal={enrichmentProposal}
          onProposalChange={setEnrichmentProposal}
          currentSyncEnrichment={currentSyncEnrichment}
          baselineSourceKind={baselineSourceKind}
        />

        <ProviderDerivedCareerInsightsPanel
          explicitConsentChecked={explicitConsentChecked}
          gmailVerification={gmailVerification}
          calendarVerification={calendarVerification}
          previewUiState={uiState}
          previewResult={previewResult}
          reviewState={reviewState}
          proposal={enrichmentProposal}
        />
      </div>
    </ApplyFlowCard>
  );
}
