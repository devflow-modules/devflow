"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  CAREER_CHAT_MAX_MESSAGE_LENGTH,
  deriveCareerAgentRequestId,
  type CareerChatIntent,
  type CareerChatResponse,
  type CareerChatToolProposal,
  type CareerToolName,
} from "@devflow/career-core";
import type { ProviderDerivedSignal } from "@devflow/career-sync";
import type { CareerBundle } from "@devflow/career-core";
import { useMemo, useState } from "react";
import { CareerToolPermissionReview } from "./career-tool-permission-review";
import {
  CAREER_CHAT_WORKSPACE_ACTION_LABEL,
  CAREER_CHAT_WORKSPACE_ACTION_LABELS,
  CAREER_CHAT_WORKSPACE_ADAPTER_DISABLED_MESSAGE,
  CAREER_CHAT_WORKSPACE_APPROVE_ONCE_LABEL,
  CAREER_CHAT_WORKSPACE_BADGE_IN_MEMORY,
  CAREER_CHAT_WORKSPACE_BADGE_MANUAL,
  CAREER_CHAT_WORKSPACE_BADGE_READ_ONLY,
  CAREER_CHAT_WORKSPACE_BLOCKED_MESSAGE,
  CAREER_CHAT_WORKSPACE_CANCEL_LABEL,
  CAREER_CHAT_WORKSPACE_CONSENT_LABEL,
  CAREER_CHAT_WORKSPACE_COPY_RESPONSE_LABEL,
  CAREER_CHAT_WORKSPACE_DESCRIPTION,
  CAREER_CHAT_WORKSPACE_DISCLAIMER,
  CAREER_CHAT_WORKSPACE_IDLE_MESSAGE,
  CAREER_CHAT_WORKSPACE_MESSAGE_LABEL,
  CAREER_CHAT_WORKSPACE_NO_BUNDLE_MESSAGE,
  CAREER_CHAT_WORKSPACE_REVIEW_PROPOSAL_LABEL,
  CAREER_CHAT_WORKSPACE_SEND_LABEL,
  CAREER_CHAT_WORKSPACE_TITLE,
  CAREER_CHAT_WORKSPACE_VALIDATING_MESSAGE,
} from "./career-chat-workspace-content";
import {
  runCareerChatLibrechat,
  type CareerChatWorkspaceUiState,
} from "./career-chat-workspace-client";

export type CareerChatWorkspaceProps = {
  careerBundle: CareerBundle | null;
  selectedSignalIds: string[];
  availableSignals: ProviderDerivedSignal[];
};

function resolveUiState(input: {
  hasBundle: boolean;
  explicitConsent: boolean;
  isSending: boolean;
  response: CareerChatResponse | null;
  errorMessage: string | null;
}): CareerChatWorkspaceUiState {
  if (input.isSending) {
    return "validating";
  }

  if (input.errorMessage) {
    return "error";
  }

  if (input.response?.status === "completed") {
    return "completed";
  }

  if (input.response?.status === "blocked") {
    return "blocked";
  }

  if (!input.hasBundle) {
    return "blocked";
  }

  if (!input.explicitConsent) {
    return "idle";
  }

  return input.response ? "completed" : "idle";
}

function defaultToolInput(
  toolName: CareerToolName,
  proposal: CareerChatToolProposal,
): Record<string, unknown> {
  return proposal.inputPreview;
}

export function CareerChatWorkspaceView({
  careerBundle,
  selectedSignalIds,
  availableSignals,
  action,
  message,
  explicitConsent,
  uiState,
  response,
  errorMessage,
  selectedProposal,
  approvedOnce,
  onActionChange,
  onMessageChange,
  onConsentChange,
  onSend,
  onReviewProposal,
  onApproveOnce,
  onCancelReview,
  onCopyResponse,
  isSending,
}: CareerChatWorkspaceProps & {
  action: CareerChatIntent;
  message: string;
  explicitConsent: boolean;
  uiState: CareerChatWorkspaceUiState;
  response: CareerChatResponse | null;
  errorMessage: string | null;
  selectedProposal: CareerChatToolProposal | null;
  approvedOnce: boolean;
  onActionChange: (action: CareerChatIntent) => void;
  onMessageChange: (message: string) => void;
  onConsentChange: (checked: boolean) => void;
  onSend: () => void;
  onReviewProposal: (proposal: CareerChatToolProposal) => void;
  onApproveOnce: () => void;
  onCancelReview: () => void;
  onCopyResponse: () => void;
  isSending: boolean;
}) {
  const messageLength = message.length;
  const emptyMessage = !careerBundle
    ? CAREER_CHAT_WORKSPACE_NO_BUNDLE_MESSAGE
    : uiState === "blocked" && response?.warnings.some((w) => w.code === "librechat_adapter_disabled")
      ? CAREER_CHAT_WORKSPACE_ADAPTER_DISABLED_MESSAGE
      : uiState === "blocked"
        ? CAREER_CHAT_WORKSPACE_BLOCKED_MESSAGE
        : uiState === "idle"
          ? CAREER_CHAT_WORKSPACE_IDLE_MESSAGE
          : uiState === "validating"
            ? CAREER_CHAT_WORKSPACE_VALIDATING_MESSAGE
            : null;

  return (
    <ApplyFlowCard
      variant="default"
      padding="sm"
      className="border border-violet-500/25 bg-violet-950/10"
      data-testid="career-chat-workspace-panel"
    >
      <div className="space-y-3 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-semibold text-violet-100/95">{CAREER_CHAT_WORKSPACE_TITLE}</h3>
          <ApplyFlowBadge tone="neutral">{CAREER_CHAT_WORKSPACE_BADGE_READ_ONLY}</ApplyFlowBadge>
          <ApplyFlowBadge tone="intel">{CAREER_CHAT_WORKSPACE_BADGE_MANUAL}</ApplyFlowBadge>
          <ApplyFlowBadge tone="neutral">{CAREER_CHAT_WORKSPACE_BADGE_IN_MEMORY}</ApplyFlowBadge>
          {response?.reviewRequired ? (
            <ApplyFlowBadge tone="warning" data-testid="career-chat-review-badge">
              Review required
            </ApplyFlowBadge>
          ) : null}
        </div>

        <p>{CAREER_CHAT_WORKSPACE_DESCRIPTION}</p>
        <p data-testid="career-chat-workspace-disclaimer">{CAREER_CHAT_WORKSPACE_DISCLAIMER}</p>

        <div className="space-y-2">
          <label htmlFor="career-chat-action-select" className="font-medium text-[color:var(--af-text)]">
            {CAREER_CHAT_WORKSPACE_ACTION_LABEL}
          </label>
          <select
            id="career-chat-action-select"
            className="w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface)] px-2 py-1.5 text-[11px] text-[color:var(--af-text)]"
            value={action}
            onChange={(event) => onActionChange(event.target.value as CareerChatIntent)}
            data-testid="career-chat-action-select"
          >
            {(Object.keys(CAREER_CHAT_WORKSPACE_ACTION_LABELS) as CareerChatIntent[]).map((value) => (
              <option key={value} value={value}>
                {CAREER_CHAT_WORKSPACE_ACTION_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="career-chat-message-input" className="font-medium text-[color:var(--af-text)]">
            {CAREER_CHAT_WORKSPACE_MESSAGE_LABEL}
          </label>
          <textarea
            id="career-chat-message-input"
            className="min-h-[96px] w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface)] px-2 py-1.5 text-[11px] text-[color:var(--af-text)]"
            value={message}
            maxLength={CAREER_CHAT_MAX_MESSAGE_LENGTH}
            onChange={(event) => onMessageChange(event.target.value)}
            data-testid="career-chat-message-input"
          />
          <p data-testid="career-chat-character-counter">
            {messageLength}/{CAREER_CHAT_MAX_MESSAGE_LENGTH}
          </p>
        </div>

        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={explicitConsent}
            onChange={(event) => onConsentChange(event.target.checked)}
            data-testid="career-chat-consent-checkbox"
          />
          <span>{CAREER_CHAT_WORKSPACE_CONSENT_LABEL}</span>
        </label>

        <ApplyFlowButton
          type="button"
          variant="primary"
          size="sm"
          disabled={!careerBundle || !explicitConsent || !message.trim() || isSending}
          onClick={onSend}
          data-testid="career-chat-send-button"
        >
          {isSending ? "Sending…" : CAREER_CHAT_WORKSPACE_SEND_LABEL}
        </ApplyFlowButton>

        {emptyMessage ? (
          <p role="status" data-testid="career-chat-status-message">
            {emptyMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p role="alert" className="text-amber-200/90" data-testid="career-chat-error-message">
            {errorMessage}
          </p>
        ) : null}

        {response?.agentResult ? (
          <div className="space-y-2" data-testid="career-chat-agent-result">
            <p className="font-medium text-[color:var(--af-text)]">Agent response</p>
            <p>Status: {response.agentResult.status}</p>
            <p>Agent: {response.agentResult.agent}</p>
            <p>Summary: {response.agentResult.summary}</p>
          </div>
        ) : null}

        {response?.toolProposals.length ? (
          <div className="space-y-2" data-testid="career-chat-tool-proposals">
            <p className="font-medium text-[color:var(--af-text)]">Tool proposals</p>
            <ul className="space-y-2">
              {response.toolProposals.map((proposal) => (
                <li
                  key={proposal.toolName}
                  className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] p-2"
                  data-testid={`career-chat-tool-proposal-${proposal.toolName}`}
                >
                  <p className="font-medium text-[color:var(--af-text)]">{proposal.toolName}</p>
                  <p>Status: {proposal.status}</p>
                  <p>Risk: {proposal.riskLevel}</p>
                  <ApplyFlowButton
                    type="button"
                    variant="outlineBrand"
                    size="sm"
                    onClick={() => onReviewProposal(proposal)}
                    data-testid={`career-chat-review-proposal-${proposal.toolName}`}
                  >
                    {CAREER_CHAT_WORKSPACE_REVIEW_PROPOSAL_LABEL}
                  </ApplyFlowButton>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {selectedProposal ? (
          <div
            className="space-y-2 rounded-[var(--af-radius-sm)] border border-violet-500/30 p-2"
            data-testid="career-chat-proposal-review-panel"
          >
            <p className="font-medium text-[color:var(--af-text)]">Proposal review</p>
            <p>Tool: {selectedProposal.toolName}</p>
            <p>Input preview: {JSON.stringify(defaultToolInput(selectedProposal.toolName, selectedProposal))}</p>
            <div className="flex flex-wrap gap-2">
              <ApplyFlowButton
                type="button"
                variant="outlineBrand"
                size="sm"
                onClick={onApproveOnce}
                data-testid="career-chat-approve-once-button"
              >
                {CAREER_CHAT_WORKSPACE_APPROVE_ONCE_LABEL}
              </ApplyFlowButton>
              <ApplyFlowButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancelReview}
                data-testid="career-chat-cancel-button"
              >
                {CAREER_CHAT_WORKSPACE_CANCEL_LABEL}
              </ApplyFlowButton>
              <ApplyFlowButton
                type="button"
                variant="outlineBrand"
                size="sm"
                onClick={onCopyResponse}
                data-testid="career-chat-copy-response-button"
              >
                {CAREER_CHAT_WORKSPACE_COPY_RESPONSE_LABEL}
              </ApplyFlowButton>
            </div>
            {approvedOnce ? (
              <p data-testid="career-chat-approved-once-status">Approved once for manual invoke.</p>
            ) : null}
          </div>
        ) : null}

        {response?.trace ? (
          <div data-testid="career-chat-trace">
            <p className="font-medium text-[color:var(--af-text)]">Execution trace</p>
            <ol className="list-inside list-decimal">
              {response.trace.steps.map((step) => (
                <li key={`${step.code}-${step.timestamp}`}>
                  {step.code}: {step.message}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </ApplyFlowCard>
  );
}

export function CareerChatWorkspace({
  careerBundle,
  selectedSignalIds,
  availableSignals,
}: CareerChatWorkspaceProps) {
  const [action, setAction] = useState<CareerChatIntent>("prepare_interview");
  const [message, setMessage] = useState("Focus on frontend architecture");
  const [explicitConsent, setExplicitConsent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<CareerChatResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<CareerChatToolProposal | null>(null);
  const [approvedOnce, setApprovedOnce] = useState(false);

  const uiState = useMemo(
    () =>
      resolveUiState({
        hasBundle: careerBundle != null && careerBundle.applications.length > 0,
        explicitConsent,
        isSending,
        response,
        errorMessage,
      }),
    [careerBundle, errorMessage, explicitConsent, isSending, response],
  );

  async function handleSend() {
    if (!careerBundle || !explicitConsent || !message.trim()) {
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    setSelectedProposal(null);
    setApprovedOnce(false);

    try {
      const nextResponse = await runCareerChatLibrechat({
        action,
        message: message.trim(),
        explicitConsent: true,
        context: {
          careerBundle,
          selectedSignalIds,
          availableSignals,
        },
      });
      setResponse(nextResponse);
    } catch {
      setErrorMessage("Career chat adapter failed safely.");
    } finally {
      setIsSending(false);
    }
  }

  const orchestration =
    response?.agentResult?.status === "completed" && careerBundle
      ? {
          intent: action,
          explicitConsent: true as const,
          context: {
            careerBundle,
            selectedSignalIds,
            availableSignals,
          },
        }
      : null;

  return (
    <>
      <CareerChatWorkspaceView
        careerBundle={careerBundle}
        selectedSignalIds={selectedSignalIds}
        availableSignals={availableSignals}
        action={action}
        message={message}
        explicitConsent={explicitConsent}
        uiState={uiState}
        response={response}
        errorMessage={errorMessage}
        selectedProposal={selectedProposal}
        approvedOnce={approvedOnce}
        onActionChange={setAction}
        onMessageChange={setMessage}
        onConsentChange={setExplicitConsent}
        onSend={() => {
          void handleSend();
        }}
        onReviewProposal={(proposal) => {
          setSelectedProposal(proposal);
          setApprovedOnce(false);
        }}
        onApproveOnce={() => setApprovedOnce(true)}
        onCancelReview={() => {
          setSelectedProposal(null);
          setApprovedOnce(false);
        }}
        onCopyResponse={() => {
          if (response) {
            void navigator.clipboard.writeText(JSON.stringify(response, null, 2));
          }
        }}
        isSending={isSending}
      />

      {approvedOnce && selectedProposal && orchestration && response?.agentResult?.status === "completed" ? (
        <CareerToolPermissionReview
          agentResult={response.agentResult}
          orchestration={orchestration}
          agentRequestId={deriveCareerAgentRequestId({
            intent: action,
            careerBundle,
            selectedSignalIds,
          })}
        />
      ) : null}
    </>
  );
}
