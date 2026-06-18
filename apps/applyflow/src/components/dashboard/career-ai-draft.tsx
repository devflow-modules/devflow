"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  CAREER_CHAT_MAX_MESSAGE_LENGTH,
  type CareerBundle,
  type CareerChatIntent,
  type CareerLlmResult,
} from "@devflow/career-core";
import type { ProviderDerivedSignal } from "@devflow/career-sync";
import { useMemo, useState } from "react";
import {
  CAREER_AI_DRAFT_ACTION_LABEL,
  CAREER_AI_DRAFT_ACTION_LABELS,
  CAREER_AI_DRAFT_BADGE_IN_MEMORY,
  CAREER_AI_DRAFT_BADGE_MANUAL,
  CAREER_AI_DRAFT_BADGE_READ_ONLY,
  CAREER_AI_DRAFT_BLOCKED_MESSAGE,
  CAREER_AI_DRAFT_CANCEL_LABEL,
  CAREER_AI_DRAFT_CONSENT_LABEL,
  CAREER_AI_DRAFT_COPY_LABEL,
  CAREER_AI_DRAFT_DESCRIPTION,
  CAREER_AI_DRAFT_DISABLED_MESSAGE,
  CAREER_AI_DRAFT_DISCLAIMER,
  CAREER_AI_DRAFT_GENERATE_LABEL,
  CAREER_AI_DRAFT_IDLE_MESSAGE,
  CAREER_AI_DRAFT_LOADING_MESSAGE,
  CAREER_AI_DRAFT_MESSAGE_LABEL,
  CAREER_AI_DRAFT_NO_BUNDLE_MESSAGE,
  CAREER_AI_DRAFT_REGENERATE_LABEL,
  CAREER_AI_DRAFT_REVIEW_PROPOSALS_LABEL,
  CAREER_AI_DRAFT_TITLE,
} from "./career-ai-draft-content";
import { runCareerLlmGenerate, type CareerAiDraftUiState } from "./career-ai-draft-client";

export type CareerAiDraftProps = {
  careerBundle: CareerBundle | null;
  selectedSignalIds: string[];
  availableSignals: ProviderDerivedSignal[];
};

function resolveUiState(input: {
  hasBundle: boolean;
  isGenerating: boolean;
  result: CareerLlmResult | null;
  errorMessage: string | null;
}): CareerAiDraftUiState {
  if (input.isGenerating) {
    return "loading";
  }

  if (input.errorMessage) {
    return "error";
  }

  if (input.result?.status === "completed") {
    return "completed";
  }

  if (input.result?.status === "blocked") {
    return "blocked";
  }

  if (!input.hasBundle) {
    return "blocked";
  }

  return "idle";
}

export function CareerAiDraftView({
  careerBundle,
  action,
  message,
  explicitConsent,
  uiState,
  result,
  errorMessage,
  showProposalsHint,
  onActionChange,
  onMessageChange,
  onConsentChange,
  onGenerate,
  onCopy,
  onReviewProposals,
  onCancel,
  isGenerating,
}: CareerAiDraftProps & {
  action: CareerChatIntent;
  message: string;
  explicitConsent: boolean;
  uiState: CareerAiDraftUiState;
  result: CareerLlmResult | null;
  errorMessage: string | null;
  showProposalsHint: boolean;
  onActionChange: (action: CareerChatIntent) => void;
  onMessageChange: (message: string) => void;
  onConsentChange: (checked: boolean) => void;
  onGenerate: () => void;
  onCopy: () => void;
  onReviewProposals: () => void;
  onCancel: () => void;
  isGenerating: boolean;
}) {
  const messageLength = message.length;
  const disabledByFlag = result?.status === "blocked" && result.warnings.some((w) => w.code === "llm_disabled");

  const statusMessage = !careerBundle
    ? CAREER_AI_DRAFT_NO_BUNDLE_MESSAGE
    : disabledByFlag
      ? CAREER_AI_DRAFT_DISABLED_MESSAGE
      : uiState === "blocked"
        ? CAREER_AI_DRAFT_BLOCKED_MESSAGE
        : uiState === "loading"
          ? CAREER_AI_DRAFT_LOADING_MESSAGE
          : uiState === "idle"
            ? CAREER_AI_DRAFT_IDLE_MESSAGE
            : null;

  const output = result?.output ?? null;

  return (
    <ApplyFlowCard
      variant="default"
      padding="sm"
      className="border border-sky-500/25 bg-sky-950/10"
      data-testid="career-ai-draft-panel"
    >
      <div className="space-y-3 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-semibold text-sky-100/95">{CAREER_AI_DRAFT_TITLE}</h3>
          <ApplyFlowBadge tone="neutral">{CAREER_AI_DRAFT_BADGE_READ_ONLY}</ApplyFlowBadge>
          <ApplyFlowBadge tone="intel">{CAREER_AI_DRAFT_BADGE_MANUAL}</ApplyFlowBadge>
          <ApplyFlowBadge tone="neutral">{CAREER_AI_DRAFT_BADGE_IN_MEMORY}</ApplyFlowBadge>
          <ApplyFlowBadge tone="neutral" data-testid="career-ai-draft-provider-badge">
            provider: {result?.provider ?? "mock"}
          </ApplyFlowBadge>
          {result?.reviewRequired ? (
            <ApplyFlowBadge tone="warning" data-testid="career-ai-draft-review-badge">
              Review required
            </ApplyFlowBadge>
          ) : null}
        </div>

        <p>{CAREER_AI_DRAFT_DESCRIPTION}</p>
        <p data-testid="career-ai-draft-disclaimer">{CAREER_AI_DRAFT_DISCLAIMER}</p>

        <div className="space-y-2">
          <label htmlFor="career-ai-draft-action-select" className="font-medium text-[color:var(--af-text)]">
            {CAREER_AI_DRAFT_ACTION_LABEL}
          </label>
          <select
            id="career-ai-draft-action-select"
            className="w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface)] px-2 py-1.5 text-[11px] text-[color:var(--af-text)]"
            value={action}
            onChange={(event) => onActionChange(event.target.value as CareerChatIntent)}
            data-testid="career-ai-draft-action-select"
          >
            {(Object.keys(CAREER_AI_DRAFT_ACTION_LABELS) as CareerChatIntent[]).map((value) => (
              <option key={value} value={value}>
                {CAREER_AI_DRAFT_ACTION_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="career-ai-draft-message-input" className="font-medium text-[color:var(--af-text)]">
            {CAREER_AI_DRAFT_MESSAGE_LABEL}
          </label>
          <textarea
            id="career-ai-draft-message-input"
            className="min-h-[96px] w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface)] px-2 py-1.5 text-[11px] text-[color:var(--af-text)]"
            value={message}
            maxLength={CAREER_CHAT_MAX_MESSAGE_LENGTH}
            onChange={(event) => onMessageChange(event.target.value)}
            data-testid="career-ai-draft-message-input"
          />
          <p data-testid="career-ai-draft-character-counter">
            {messageLength}/{CAREER_CHAT_MAX_MESSAGE_LENGTH}
          </p>
        </div>

        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={explicitConsent}
            onChange={(event) => onConsentChange(event.target.checked)}
            data-testid="career-ai-draft-consent-checkbox"
          />
          <span>{CAREER_AI_DRAFT_CONSENT_LABEL}</span>
        </label>

        <div className="flex flex-wrap gap-2">
          <ApplyFlowButton
            type="button"
            variant="primary"
            size="sm"
            disabled={!careerBundle || !explicitConsent || !message.trim() || isGenerating}
            onClick={onGenerate}
            data-testid="career-ai-draft-generate-button"
          >
            {isGenerating
              ? "Generating…"
              : result
                ? CAREER_AI_DRAFT_REGENERATE_LABEL
                : CAREER_AI_DRAFT_GENERATE_LABEL}
          </ApplyFlowButton>
          {result?.status === "completed" ? (
            <>
              <ApplyFlowButton
                type="button"
                variant="outlineBrand"
                size="sm"
                onClick={onCopy}
                data-testid="career-ai-draft-copy-button"
              >
                {CAREER_AI_DRAFT_COPY_LABEL}
              </ApplyFlowButton>
              <ApplyFlowButton
                type="button"
                variant="outlineBrand"
                size="sm"
                onClick={onReviewProposals}
                data-testid="career-ai-draft-review-proposals-button"
              >
                {CAREER_AI_DRAFT_REVIEW_PROPOSALS_LABEL}
              </ApplyFlowButton>
              <ApplyFlowButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                data-testid="career-ai-draft-cancel-button"
              >
                {CAREER_AI_DRAFT_CANCEL_LABEL}
              </ApplyFlowButton>
            </>
          ) : null}
        </div>

        {statusMessage ? (
          <p role="status" data-testid="career-ai-draft-status-message">
            {statusMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p role="alert" className="text-amber-200/90" data-testid="career-ai-draft-error-message">
            {errorMessage}
          </p>
        ) : null}

        {result?.status === "completed" ? (
          <div className="space-y-1" data-testid="career-ai-draft-meta">
            <p>Task: {result.task}</p>
            <p>Agent: {result.agent}</p>
            <p>External provider called: {String(result.externalProviderCalled)}</p>
          </div>
        ) : null}

        {output ? (
          <div className="space-y-2" data-testid="career-ai-draft-output">
            <p className="font-medium text-[color:var(--af-text)]">{output.title}</p>
            <p data-testid="career-ai-draft-summary">{output.summary}</p>

            {output.findings.length ? (
              <div data-testid="career-ai-draft-findings">
                <p className="font-medium text-[color:var(--af-text)]">Findings</p>
                <ul className="list-inside list-disc">
                  {output.findings.map((finding, index) => (
                    <li key={`finding-${index}`}>
                      [{finding.category}|{finding.priority}] {finding.text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {output.recommendations.length ? (
              <div data-testid="career-ai-draft-recommendations">
                <p className="font-medium text-[color:var(--af-text)]">Recommendations</p>
                <ul className="list-inside list-disc">
                  {output.recommendations.map((recommendation, index) => (
                    <li key={`recommendation-${index}`}>
                      [{recommendation.category}|{recommendation.priority}] {recommendation.text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {output.evidenceReferences.length ? (
              <div data-testid="career-ai-draft-evidence">
                <p className="font-medium text-[color:var(--af-text)]">Evidence references</p>
                <ul className="list-inside list-disc">
                  {output.evidenceReferences.map((evidence, index) => (
                    <li key={`evidence-${index}`}>{evidence}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {result?.warnings.length ? (
          <div data-testid="career-ai-draft-warnings">
            <p className="font-medium text-[color:var(--af-text)]">Warnings</p>
            <ul className="list-inside list-disc">
              {result.warnings.map((warning, index) => (
                <li key={`warning-${index}`}>
                  {warning.code}: {warning.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {showProposalsHint ? (
          <p data-testid="career-ai-draft-proposals-hint">
            Tool proposals are produced deterministically in the Career Chat Workspace and require
            separate human approval. This draft never executes tools.
          </p>
        ) : null}

        {result?.trace ? (
          <div data-testid="career-ai-draft-trace">
            <p className="font-medium text-[color:var(--af-text)]">Execution trace</p>
            <ol className="list-inside list-decimal">
              {result.trace.steps.map((step) => (
                <li key={`${step.code}-${step.timestamp}-${step.status}`}>
                  {step.code} ({step.status}): {step.message}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </ApplyFlowCard>
  );
}

export function CareerAiDraft({ careerBundle, selectedSignalIds, availableSignals }: CareerAiDraftProps) {
  const [action, setAction] = useState<CareerChatIntent>("analyze_application_fit");
  const [message, setMessage] = useState("Focus on backend architecture and reliability.");
  const [explicitConsent, setExplicitConsent] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<CareerLlmResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showProposalsHint, setShowProposalsHint] = useState(false);

  const uiState = useMemo(
    () =>
      resolveUiState({
        hasBundle: careerBundle != null && careerBundle.applications.length > 0,
        isGenerating,
        result,
        errorMessage,
      }),
    [careerBundle, errorMessage, isGenerating, result],
  );

  async function handleGenerate() {
    if (!careerBundle || !explicitConsent || !message.trim()) {
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setShowProposalsHint(false);

    try {
      const nextResult = await runCareerLlmGenerate({
        explicitConsent: true,
        chatRequest: {
          action,
          message: message.trim(),
        },
        context: {
          careerBundle,
          selectedSignalIds,
          availableSignals,
        },
      });
      setResult(nextResult);
    } catch {
      setErrorMessage("Controlled LLM generation failed safely.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <CareerAiDraftView
      careerBundle={careerBundle}
      selectedSignalIds={selectedSignalIds}
      availableSignals={availableSignals}
      action={action}
      message={message}
      explicitConsent={explicitConsent}
      uiState={uiState}
      result={result}
      errorMessage={errorMessage}
      showProposalsHint={showProposalsHint}
      onActionChange={setAction}
      onMessageChange={setMessage}
      onConsentChange={setExplicitConsent}
      onGenerate={() => {
        void handleGenerate();
      }}
      onCopy={() => {
        if (result?.output) {
          void navigator.clipboard.writeText(JSON.stringify(result.output, null, 2));
        }
      }}
      onReviewProposals={() => setShowProposalsHint(true)}
      onCancel={() => {
        setResult(null);
        setErrorMessage(null);
        setShowProposalsHint(false);
      }}
      isGenerating={isGenerating}
    />
  );
}
