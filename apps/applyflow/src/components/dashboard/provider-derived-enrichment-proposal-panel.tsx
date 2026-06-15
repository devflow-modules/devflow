"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  buildProviderDerivedEnrichmentProposal,
  canBuildEnrichmentProposal,
  isEnrichmentProposalStale,
  type ProviderDerivedEnrichmentProposal,
} from "@/lib/provider-runtime/provider-derived-enrichment-proposal";
import {
  buildProviderDerivedEnrichmentProposalExport,
  canExportEnrichmentProposal,
} from "@/lib/provider-runtime/provider-derived-enrichment-proposal-export";
import { downloadProviderDerivedEnrichmentProposal } from "./provider-derived-enrichment-proposal-download";
import type { ProviderDerivedRuntimePreviewClientResult } from "./provider-derived-runtime-preview-client";
import {
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_BADGE_EPHEMERAL,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_BADGE_NO_AUTO,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_BADGE_NOT_SAVED,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_BADGE_REVIEW,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_BUILD_LABEL,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_DESCRIPTION,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_DOWNLOAD_HELPER,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_DOWNLOAD_LABEL,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_DOWNLOADED_MESSAGE,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_ERROR_MESSAGE,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_INVALID_MESSAGE,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_NOT_APPLIED_MESSAGE,
  PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_TITLE,
} from "./provider-derived-enrichment-proposal-content";
import type { ProviderDerivedRuntimeReviewState } from "./provider-derived-runtime-review-state";
import { useEffect, useState } from "react";

export type ProviderDerivedEnrichmentProposalExportUiStatus =
  | "idle"
  | "downloaded"
  | "invalid"
  | "error";

export type ProviderDerivedEnrichmentProposalPanelProps = {
  previewResult: ProviderDerivedRuntimePreviewClientResult | null;
  reviewState: ProviderDerivedRuntimeReviewState;
  isPreviewLoading: boolean;
  proposal: ProviderDerivedEnrichmentProposal | null;
  onProposalChange: (proposal: ProviderDerivedEnrichmentProposal | null) => void;
};

function renderProposalSummary(proposal: ProviderDerivedEnrichmentProposal) {
  const enrichment = proposal.enrichment;

  return (
    <div
      className="space-y-2 rounded-[var(--af-radius-sm)] border border-emerald-500/30 bg-emerald-950/20 p-2"
      role="status"
      aria-live="polite"
      data-testid="provider-derived-enrichment-proposal-summary"
    >
      <p>
        Status:{" "}
        <span className="font-medium text-[color:var(--af-text)]">{proposal.status}</span>
      </p>
      <p>
        Source signals:{" "}
        <span className="font-medium text-[color:var(--af-text)]">{proposal.sourceSignalCount}</span>
      </p>
      {proposal.generatedAt ? (
        <p>
          Generated at:{" "}
          <span className="font-medium text-[color:var(--af-text)]">{proposal.generatedAt}</span>
        </p>
      ) : null}
      {enrichment ? (
        <>
          <p>
            Companies:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {enrichment.stats.companyHints.join(", ") || "none"}
            </span>
          </p>
          <p>
            Pending actions:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {enrichment.stats.actionRequiredCount}
            </span>
          </p>
          <p>
            Upcoming events:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {enrichment.stats.upcomingCount}
            </span>
          </p>
          <p>
            Gmail source count:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {enrichment.stats.sourceCounts.gmail}
            </span>
          </p>
          <p>
            Calendar source count:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {enrichment.stats.sourceCounts.calendar}
            </span>
          </p>
          <p>
            Privacy redacted:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {enrichment.privacy.redacted ? "yes" : "no"}
            </span>
          </p>
          <p>
            Privacy user review required:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {enrichment.privacy.userReviewRequired ? "yes" : "no"}
            </span>
          </p>
        </>
      ) : null}
      {proposal.warnings.length > 0 ? (
        <ul className="list-inside list-disc space-y-1 text-amber-200/90">
          {proposal.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      {proposal.messages.map((message) => (
        <p key={message}>{message}</p>
      ))}
      <p>{PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_NOT_APPLIED_MESSAGE}</p>
    </div>
  );
}

export function ProviderDerivedEnrichmentProposalPanelView({
  previewResult,
  reviewState,
  isPreviewLoading,
  proposal,
  buildEnabled,
  downloadEnabled,
  exportStatus,
  onBuildProposal,
  onDownloadProposal,
}: {
  previewResult: ProviderDerivedRuntimePreviewClientResult | null;
  reviewState: ProviderDerivedRuntimeReviewState;
  isPreviewLoading: boolean;
  proposal: ProviderDerivedEnrichmentProposal | null;
  buildEnabled: boolean;
  downloadEnabled: boolean;
  exportStatus: ProviderDerivedEnrichmentProposalExportUiStatus;
  onBuildProposal: () => void;
  onDownloadProposal: () => void;
}) {
  const exportStatusMessage =
    exportStatus === "downloaded"
      ? PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_DOWNLOADED_MESSAGE
      : exportStatus === "invalid"
        ? PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_INVALID_MESSAGE
        : exportStatus === "error"
          ? PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_EXPORT_ERROR_MESSAGE
          : null;
  return (
    <ApplyFlowCard
      variant="default"
      padding="sm"
      className="border border-sky-500/25 bg-sky-950/10"
      data-testid="provider-derived-enrichment-proposal-panel"
    >
      <div className="space-y-3 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-sky-100/95">
            {PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_TITLE}
          </p>
          <ApplyFlowBadge tone="neutral">{PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_BADGE_EPHEMERAL}</ApplyFlowBadge>
          <ApplyFlowBadge tone="intel">{PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_BADGE_REVIEW}</ApplyFlowBadge>
          <ApplyFlowBadge tone="neutral">{PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_BADGE_NO_AUTO}</ApplyFlowBadge>
          <ApplyFlowBadge tone="neutral">{PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_BADGE_NOT_SAVED}</ApplyFlowBadge>
        </div>

        <p>{PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_DESCRIPTION}</p>

        <ApplyFlowButton
          type="button"
          variant="outlineBrand"
          size="sm"
          disabled={!buildEnabled}
          aria-label={PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_BUILD_LABEL}
          onClick={onBuildProposal}
          data-testid="provider-derived-enrichment-proposal-build"
        >
          {PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_BUILD_LABEL}
        </ApplyFlowButton>

        {proposal && proposal.status === "ready" ? (
          <>
            <p>{PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_DOWNLOAD_HELPER}</p>
            <ApplyFlowButton
              type="button"
              variant="outlineBrand"
              size="sm"
              disabled={!downloadEnabled}
              aria-label={PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_DOWNLOAD_LABEL}
              onClick={onDownloadProposal}
              data-testid="provider-derived-enrichment-proposal-download"
            >
              {PROVIDER_DERIVED_ENRICHMENT_PROPOSAL_DOWNLOAD_LABEL}
            </ApplyFlowButton>
          </>
        ) : null}

        {exportStatusMessage ? (
          <p
            role="status"
            aria-live="polite"
            data-testid="provider-derived-enrichment-proposal-export-status"
          >
            {exportStatusMessage}
          </p>
        ) : null}

        {proposal && proposal.status !== "idle" ? renderProposalSummary(proposal) : null}

        {!previewResult && !isPreviewLoading ? (
          <p role="status" aria-live="polite" data-testid="provider-derived-enrichment-proposal-empty">
            Run the read-only preview and mark your selection ready before building a proposal.
          </p>
        ) : null}
      </div>
    </ApplyFlowCard>
  );
}

/**
 * In-memory enrichment proposal from explicitly selected runtime signals.
 * Does not persist, call providers, or apply changes automatically.
 */
export function ProviderDerivedEnrichmentProposalPanel({
  previewResult,
  reviewState,
  isPreviewLoading,
  proposal,
  onProposalChange,
}: ProviderDerivedEnrichmentProposalPanelProps) {
  const [exportStatus, setExportStatus] =
    useState<ProviderDerivedEnrichmentProposalExportUiStatus>("idle");

  const isProposalStale = isEnrichmentProposalStale(proposal, {
    previewResult,
    reviewState,
    isPreviewLoading,
  });

  const buildEnabled = canBuildEnrichmentProposal({
    previewResult,
    reviewState,
    isPreviewLoading,
  });

  const downloadEnabled = canExportEnrichmentProposal({
    proposal,
    isProposalStale,
  });

  useEffect(() => {
    setExportStatus("idle");
  }, [proposal, previewResult, reviewState, isPreviewLoading, isProposalStale]);

  return (
    <ProviderDerivedEnrichmentProposalPanelView
      previewResult={previewResult}
      reviewState={reviewState}
      isPreviewLoading={isPreviewLoading}
      proposal={proposal}
      buildEnabled={buildEnabled}
      downloadEnabled={downloadEnabled}
      exportStatus={exportStatus}
      onBuildProposal={() => {
        if (!previewResult || !buildEnabled) {
          return;
        }

        onProposalChange(
          buildProviderDerivedEnrichmentProposal({
            previewResult,
            reviewState,
            generatedAt: new Date().toISOString(),
          }),
        );
      }}
      onDownloadProposal={() => {
        if (!proposal || !downloadEnabled) {
          return;
        }

        const exportedAt = new Date().toISOString();
        const exportResult = buildProviderDerivedEnrichmentProposalExport({
          proposal,
          exportedAt,
        });

        if (exportResult.status === "ready" && exportResult.downloadable && exportResult.json && exportResult.filename) {
          downloadProviderDerivedEnrichmentProposal({
            filename: exportResult.filename,
            json: exportResult.json,
          });
          setExportStatus("downloaded");
          return;
        }

        setExportStatus(exportResult.status === "error" ? "error" : "invalid");
      }}
    />
  );
}
