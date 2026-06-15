"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import type { ProviderConnectionVerificationResult } from "@devflow/career-sync";
import { useEffect, useState } from "react";
import {
  runProviderDerivedRuntimePreview,
  type ProviderDerivedRuntimePreviewClientResult,
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

export type ProviderDerivedRuntimePreviewUiState =
  | "idle"
  | "loading"
  | "completed"
  | "partial"
  | "blocked"
  | "error";

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
 * Uses React local state only — no browser persistence.
 */

export function ProviderDerivedRuntimePreviewPanel({
  explicitConsentChecked,
  gmailVerification,
  calendarVerification,
}: {
  explicitConsentChecked: boolean;
  gmailVerification: ProviderConnectionVerificationResult | null;
  calendarVerification: ProviderConnectionVerificationResult | null;
}) {
  const [uiState, setUiState] = useState<ProviderDerivedRuntimePreviewUiState>("idle");
  const [previewResult, setPreviewResult] =
    useState<ProviderDerivedRuntimePreviewClientResult | null>(null);

  const gmailVerified = isGmailServerVerified(gmailVerification);
  const calendarVerified = isCalendarServerVerified(calendarVerification);

  const previewEnabled =
    explicitConsentChecked && gmailVerified && calendarVerified && uiState !== "loading";

  useEffect(() => {
    setPreviewResult(null);
    setUiState("idle");
  }, [
    explicitConsentChecked,
    gmailVerification?.state,
    gmailVerification?.checkedAt,
    calendarVerification?.state,
    calendarVerification?.checkedAt,
  ]);

  async function handleRunPreview() {
    if (!previewEnabled) {
      return;
    }

    setUiState("loading");
    setPreviewResult(null);

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
            {previewResult.signals.length > 0 ? (
              <ul
                className="list-inside list-disc space-y-1"
                data-testid="provider-derived-runtime-preview-signals"
              >
                {previewResult.signals.map((signal) => (
                  <li key={signal.id}>
                    {signal.source} · {signal.kind} · {signal.occurredAt}
                    {signal.company ? ` · ${signal.company}` : ""} · confidence {signal.confidence}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </ApplyFlowCard>
  );
}
