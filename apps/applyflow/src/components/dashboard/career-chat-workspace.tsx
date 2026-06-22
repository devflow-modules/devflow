"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  CAREER_CHAT_MAX_MESSAGE_LENGTH,
  deriveCareerAgentRequestId,
  type CareerAnalysisInput,
  type CareerChatIntent,
  type CareerChatResponse,
  type CareerChatToolProposal,
  type CareerToolName,
} from "@devflow/career-core";
import type { ProviderDerivedSignal } from "@devflow/career-sync";
import type { CareerBundle } from "@devflow/career-core";
import { useEffect, useMemo, useState } from "react";
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
  CAREER_CHAT_WORKSPACE_SPECIALIST_LABEL,
  CAREER_CHAT_WORKSPACE_RESUME_BULLETS_LABEL,
  CAREER_CHAT_WORKSPACE_RESUME_SKILLS_LABEL,
  CAREER_CHAT_WORKSPACE_JOB_REQUIREMENTS_LABEL,
  CAREER_CHAT_WORKSPACE_TARGET_ROLES_LABEL,
  CAREER_CHAT_WORKSPACE_AVAILABILITY_LABEL,
  CAREER_CHAT_WORKSPACE_PILOT_BADGE,
  CAREER_CHAT_WORKSPACE_PILOT_NOTICE,
  CAREER_CHAT_WORKSPACE_FEEDBACK_PROMPT,
  CAREER_CHAT_WORKSPACE_FEEDBACK_HELPFUL_LABEL,
  CAREER_CHAT_WORKSPACE_FEEDBACK_PARTIAL_LABEL,
  CAREER_CHAT_WORKSPACE_FEEDBACK_NOT_HELPFUL_LABEL,
  CAREER_CHAT_WORKSPACE_FEEDBACK_THANKS,
} from "./career-chat-workspace-content";
import {
  careerFeedbackCategoryForIntent,
  CareerChatRequestError,
  runCareerChatLibrechat,
  submitCareerFeedback,
  type CareerChatWorkspaceUiState,
  type CareerFeedbackRating,
} from "./career-chat-workspace-client";
import {
  CAREER_PILOT_ACTION_LABEL,
  CAREER_PILOT_ACTION_LABELS,
  CAREER_PILOT_CONSENT_LABEL,
  CAREER_PILOT_DEFAULT_MESSAGE,
  CAREER_PILOT_EMPTY_ATS_HINT,
  CAREER_PILOT_EMPTY_RESUME_HINT,
  CAREER_PILOT_EMPTY_STRATEGY_HINT,
  CAREER_PILOT_ERROR_DESCRIPTION,
  CAREER_PILOT_ERROR_TITLE,
  CAREER_PILOT_INTENTS,
  CAREER_PILOT_MESSAGE_LABEL,
  CAREER_PILOT_SEND_LABEL,
  CAREER_PILOT_WORKFLOW_COPY,
  type CareerPilotIntent,
  isCareerPilotIntent,
} from "./career-pilot-content";
import { isCareerPilotModeClient } from "@/lib/career-system/feature-flags";
import {
  buildPilotCareerBundleFromFields,
  hasPilotAnalysisInputs,
} from "./build-pilot-career-bundle";
import { buildCareerPilotResultModel } from "./career-pilot-result-mapper";
import { CareerPilotResultView } from "./career-pilot-result-view";
import { CareerPilotFeedback } from "./career-pilot-feedback";
import { CareerPilotInputReview } from "./career-pilot-input-review";
import { CareerPilotSimpleInputsForm } from "./career-pilot-simple-inputs-form";
import {
  buildCareerSpecialistFieldsFromSimpleInputs,
  extractJobKeywords,
  hasSimplePilotAnalysisInputs,
} from "./career-pilot-input-normalizer";
import {
  CAREER_PILOT_EMPTY_CAREER_GOAL_MESSAGE,
  CAREER_PILOT_EMPTY_JOB_MESSAGE,
  CAREER_PILOT_EMPTY_RESUME_MESSAGE,
} from "./career-pilot-simple-input-content";
import type { CareerPilotSimpleInputs } from "./career-pilot-simple-inputs";
import { EMPTY_CAREER_PILOT_SIMPLE_INPUTS } from "./career-pilot-simple-inputs";
import { CareerAnalysisLoading } from "./career-analysis-loading";
import { CareerAnalysisError } from "./career-analysis-error";
import {
  careerPolishBodyText,
  careerPolishInput,
  careerPolishLabel,
  careerPolishSectionSurface,
  careerPolishTextarea,
} from "./career-polish-classes";
import { cn } from "@/lib/cn";

const SPECIALIST_INTENTS: CareerChatIntent[] = [
  "analyze_resume",
  "analyze_ats_compatibility",
  "plan_career_strategy",
];

function isSpecialistIntent(action: CareerChatIntent): boolean {
  return SPECIALIST_INTENTS.includes(action);
}

export type CareerSpecialistFields = {
  resumeSummary: string;
  resumeBullets: string;
  resumeSkills: string;
  jobRequirements: string;
  targetRoles: string;
  availability: string;
};

export const EMPTY_SPECIALIST_FIELDS: CareerSpecialistFields = {
  resumeSummary: "",
  resumeBullets: "",
  resumeSkills: "",
  jobRequirements: "",
  targetRoles: "",
  availability: "",
};

function toLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function toCommaList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 50);
}

export function buildSpecialistAnalysisInput(input: {
  action: CareerChatIntent;
  fields: CareerSpecialistFields;
  mainStack: string[];
  fallbackRole: string;
}): CareerAnalysisInput | undefined {
  const { action, fields, mainStack, fallbackRole } = input;
  if (!isSpecialistIntent(action)) {
    return undefined;
  }

  const skills = toCommaList(fields.resumeSkills);
  const resolvedSkills = skills.length > 0 ? skills : mainStack;
  const bullets = toLines(fields.resumeBullets);
  const summary = fields.resumeSummary.trim() || undefined;
  const resumeSnapshot = {
    ...(summary ? { summary } : {}),
    skills: resolvedSkills,
    experiences:
      bullets.length > 0
        ? [{ title: fallbackRole || "Experience", company: "—", bullets }]
        : [],
  };

  if (action === "analyze_resume") {
    return {
      resumeSnapshot,
      targetRole: fallbackRole || undefined,
      targetStack: mainStack.length > 0 ? mainStack : undefined,
    };
  }

  if (action === "analyze_ats_compatibility") {
    const requirements = toLines(fields.jobRequirements);
    return {
      resumeSnapshot,
      jobSnapshot: {
        title: fallbackRole || "Target role",
        requiredRequirements: requirements,
        keywords: extractJobKeywords(requirements.join(" ")),
      },
    };
  }

  return {
    targetRoles: toCommaList(fields.targetRoles),
    availability: fields.availability.trim() || undefined,
  };
}

export type CareerChatWorkspaceProps = {
  careerBundle: CareerBundle | null;
  selectedSignalIds: string[];
  availableSignals: ProviderDerivedSignal[];
  pilotPresentation?: boolean;
  pilotIntent?: CareerChatIntent;
  initialSpecialistFields?: CareerSpecialistFields;
  simpleInputs?: CareerPilotSimpleInputs;
  onSimpleInputsChange?: (next: CareerPilotSimpleInputs) => void;
  onPilotActionChange?: (action: CareerChatIntent) => void;
  onPilotAnalysisComplete?: (intent: CareerPilotIntent) => void;
};

function resolveUiState(input: {
  hasBundle: boolean;
  explicitConsent: boolean;
  isSending: boolean;
  response: CareerChatResponse | null;
  errorMessage: string | null;
  pilotPresentation?: boolean;
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
    return input.pilotPresentation ? "idle" : "blocked";
  }

  if (!input.explicitConsent) {
    return "idle";
  }

  return "idle";
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
  specialistFields = EMPTY_SPECIALIST_FIELDS,
  onSpecialistFieldChange,
  pilotMode = false,
  pilotPresentation = false,
  feedbackSubmitted = false,
  onSubmitFeedback,
  onSubmitPilotFeedback,
  submitDisabled = false,
  onDismissError,
  simpleInputs,
  onSimpleInputsChange,
  validationMessage = null,
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
  specialistFields?: CareerSpecialistFields;
  onSpecialistFieldChange?: (field: keyof CareerSpecialistFields, value: string) => void;
  pilotMode?: boolean;
  pilotPresentation?: boolean;
  feedbackSubmitted?: boolean;
  onSubmitFeedback?: (rating: CareerFeedbackRating) => void;
  onSubmitPilotFeedback?: (input: {
    rating: CareerFeedbackRating;
    consentToStore: boolean;
  }) => Promise<{ ok: boolean }>;
  submitDisabled?: boolean;
  onDismissError?: () => void;
  simpleInputs?: CareerPilotSimpleInputs;
  onSimpleInputsChange?: (next: CareerPilotSimpleInputs) => void;
  validationMessage?: string | null;
}) {
  const messageLength = message.length;
  const showSpecialist = pilotPresentation || isSpecialistIntent(action);
  const warnings = response?.warnings ?? [];
  const toolProposals = response?.toolProposals ?? [];
  const resumeAnalysis = response?.agentResult?.resumeAnalysis;
  const atsAnalysis = response?.agentResult?.atsAnalysis;
  const careerStrategyPlan = response?.agentResult?.careerStrategyPlan;
  const reviewProposal = response?.agentResult?.reviewProposal;
  const pilotResultModel =
    pilotPresentation && response?.status === "completed"
      ? buildCareerPilotResultModel({
          intent: action,
          response,
          participantSurface: pilotPresentation,
        })
      : null;
  const visibleActions = pilotPresentation ? CAREER_PILOT_INTENTS : (Object.keys(CAREER_CHAT_WORKSPACE_ACTION_LABELS) as CareerChatIntent[]);
  const actionLabels = pilotPresentation ? CAREER_PILOT_ACTION_LABELS : CAREER_CHAT_WORKSPACE_ACTION_LABELS;

  const pilotEmptyHint = validationMessage
    ? validationMessage
    : action === "plan_career_strategy"
      ? CAREER_PILOT_EMPTY_STRATEGY_HINT
      : action === "analyze_ats_compatibility"
        ? CAREER_PILOT_EMPTY_ATS_HINT
        : CAREER_PILOT_EMPTY_RESUME_HINT;

  const emptyMessage = pilotPresentation
    ? uiState === "blocked" && warnings.some((w) => w.code === "librechat_adapter_disabled")
      ? CAREER_CHAT_WORKSPACE_ADAPTER_DISABLED_MESSAGE
      : uiState === "blocked"
        ? CAREER_CHAT_WORKSPACE_BLOCKED_MESSAGE
        : uiState === "idle" && !explicitConsent
          ? pilotEmptyHint
          : uiState === "validating"
            ? CAREER_CHAT_WORKSPACE_VALIDATING_MESSAGE
            : null
    : !careerBundle
      ? CAREER_CHAT_WORKSPACE_NO_BUNDLE_MESSAGE
      : uiState === "blocked" && warnings.some((w) => w.code === "librechat_adapter_disabled")
        ? CAREER_CHAT_WORKSPACE_ADAPTER_DISABLED_MESSAGE
        : uiState === "blocked"
          ? CAREER_CHAT_WORKSPACE_BLOCKED_MESSAGE
          : uiState === "idle"
            ? CAREER_CHAT_WORKSPACE_IDLE_MESSAGE
            : uiState === "validating"
              ? CAREER_CHAT_WORKSPACE_VALIDATING_MESSAGE
              : null;

  const workflowCopy =
    pilotPresentation && isCareerPilotIntent(action)
      ? CAREER_PILOT_WORKFLOW_COPY[action]
      : null;

  return (
    <ApplyFlowCard
      variant="default"
      padding={pilotPresentation ? "md" : "sm"}
      className={cn(
        pilotPresentation
          ? `${careerPolishSectionSurface} space-y-5`
          : "border border-violet-500/25 bg-violet-950/10",
      )}
      data-testid="career-chat-workspace-panel"
    >
      <div
        className={cn(
          "space-y-4",
          pilotPresentation ? "text-sm leading-relaxed" : "space-y-3 text-[11px] leading-snug text-[color:var(--af-text-muted)]",
        )}
      >
        {pilotPresentation && workflowCopy ? (
          <header className="space-y-1 border-b border-[color:var(--af-border)] pb-4">
            <h3 className="text-lg font-semibold text-[color:var(--af-text)]">{workflowCopy.title}</h3>
            <p className={careerPolishBodyText}>{workflowCopy.description}</p>
          </header>
        ) : (
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
            {pilotMode ? (
              <ApplyFlowBadge tone="brand" data-testid="career-chat-pilot-badge">
                {CAREER_CHAT_WORKSPACE_PILOT_BADGE}
              </ApplyFlowBadge>
            ) : null}
          </div>
        )}

        {!pilotPresentation && pilotMode ? (
          <p
            role="note"
            className="rounded-[var(--af-radius-sm)] border border-emerald-500/25 bg-emerald-950/20 px-2 py-1.5 text-emerald-200/90"
            data-testid="career-chat-pilot-notice"
          >
            {CAREER_CHAT_WORKSPACE_PILOT_NOTICE}
          </p>
        ) : null}

        {!pilotPresentation ? (
          <>
            <p>{CAREER_CHAT_WORKSPACE_DESCRIPTION}</p>
            <p data-testid="career-chat-workspace-disclaimer">{CAREER_CHAT_WORKSPACE_DISCLAIMER}</p>
          </>
        ) : null}

        <div className="space-y-2">
          <p className={pilotPresentation ? careerPolishLabel : "font-medium text-[color:var(--af-text)]"}>
            {pilotPresentation ? CAREER_PILOT_ACTION_LABEL : CAREER_CHAT_WORKSPACE_ACTION_LABEL}
          </p>
          {pilotPresentation ? (
            <div
              className="grid gap-2 sm:grid-cols-3"
              role="group"
              aria-label={CAREER_PILOT_ACTION_LABEL}
              data-testid="career-pilot-intent-group"
            >
              {visibleActions.map((value) => {
                const intent = value as CareerPilotIntent;
                const isSelected = action === intent;
                return (
                  <ApplyFlowButton
                    key={value}
                    type="button"
                    variant={isSelected ? "primary" : "secondary"}
                    size="md"
                    className="h-auto min-h-[2.75rem] w-full whitespace-normal py-2.5 text-left text-sm"
                    aria-pressed={isSelected}
                    onClick={() => onActionChange(intent)}
                    data-testid={`career-pilot-intent-${intent}`}
                  >
                    {actionLabels[intent]}
                  </ApplyFlowButton>
                );
              })}
            </div>
          ) : (
            <select
              id="career-chat-action-select"
              className="w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface)] px-2 py-1.5 text-[11px] text-[color:var(--af-text)]"
              value={action}
              onChange={(event) => onActionChange(event.target.value as CareerChatIntent)}
              data-testid="career-chat-action-select"
            >
              {visibleActions.map((value) => (
                <option key={value} value={value}>
                  {actionLabels[value as keyof typeof actionLabels] ?? value}
                </option>
              ))}
            </select>
          )}
        </div>

        {showSpecialist && pilotPresentation && simpleInputs && onSimpleInputsChange ? (
          <div
            className="space-y-4 rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] p-4"
            data-testid="career-chat-specialist-inputs"
          >
            <CareerPilotSimpleInputsForm
              intent={action}
              value={simpleInputs}
              onChange={onSimpleInputsChange}
            />
            <CareerPilotInputReview
              intent={action}
              fields={specialistFields}
              onFieldChange={(field, value) => onSpecialistFieldChange?.(field, value)}
            />
          </div>
        ) : null}

        {showSpecialist && !pilotPresentation ? (
          <div
            className="space-y-2 rounded-[var(--af-radius-sm)] border border-violet-500/25 p-2"
            data-testid="career-chat-specialist-inputs"
          >
            <p className="font-medium text-[color:var(--af-text)]">
              {CAREER_CHAT_WORKSPACE_SPECIALIST_LABEL}
            </p>
            {action !== "plan_career_strategy" ? (
              <>
                <label htmlFor="career-chat-resume-bullets" className={careerPolishLabel}>
                  {CAREER_CHAT_WORKSPACE_RESUME_BULLETS_LABEL}
                </label>
                <textarea
                  id="career-chat-resume-bullets"
                  className={careerPolishTextarea}
                  value={specialistFields.resumeBullets}
                  onChange={(event) => onSpecialistFieldChange?.("resumeBullets", event.target.value)}
                  data-testid="career-chat-resume-bullets"
                />
                <label htmlFor="career-chat-resume-skills" className={careerPolishLabel}>
                  {CAREER_CHAT_WORKSPACE_RESUME_SKILLS_LABEL}
                </label>
                <input
                  id="career-chat-resume-skills"
                  className={careerPolishInput}
                  value={specialistFields.resumeSkills}
                  onChange={(event) => onSpecialistFieldChange?.("resumeSkills", event.target.value)}
                  data-testid="career-chat-resume-skills"
                />
              </>
            ) : null}
            {action === "analyze_ats_compatibility" ? (
              <>
                <label htmlFor="career-chat-job-requirements" className={careerPolishLabel}>
                  {CAREER_CHAT_WORKSPACE_JOB_REQUIREMENTS_LABEL}
                </label>
                <textarea
                  id="career-chat-job-requirements"
                  className={careerPolishTextarea}
                  value={specialistFields.jobRequirements}
                  onChange={(event) => onSpecialistFieldChange?.("jobRequirements", event.target.value)}
                  data-testid="career-chat-job-requirements"
                />
              </>
            ) : null}
            {action === "plan_career_strategy" ? (
              <>
                <label htmlFor="career-chat-target-roles" className={careerPolishLabel}>
                  {CAREER_CHAT_WORKSPACE_TARGET_ROLES_LABEL}
                </label>
                <input
                  id="career-chat-target-roles"
                  className={careerPolishInput}
                  value={specialistFields.targetRoles}
                  onChange={(event) => onSpecialistFieldChange?.("targetRoles", event.target.value)}
                  data-testid="career-chat-target-roles"
                />
                <label htmlFor="career-chat-availability" className={careerPolishLabel}>
                  {CAREER_CHAT_WORKSPACE_AVAILABILITY_LABEL}
                </label>
                <input
                  id="career-chat-availability"
                  className={careerPolishInput}
                  value={specialistFields.availability}
                  onChange={(event) => onSpecialistFieldChange?.("availability", event.target.value)}
                  data-testid="career-chat-availability"
                />
              </>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="career-chat-message-input" className={careerPolishLabel}>
            {pilotPresentation ? CAREER_PILOT_MESSAGE_LABEL : CAREER_CHAT_WORKSPACE_MESSAGE_LABEL}
          </label>
          <textarea
            id="career-chat-message-input"
            className={pilotPresentation ? careerPolishTextarea : "min-h-[96px] w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface)] px-2 py-1.5 text-[11px] text-[color:var(--af-text)]"}
            value={message}
            maxLength={CAREER_CHAT_MAX_MESSAGE_LENGTH}
            onChange={(event) => onMessageChange(event.target.value)}
            data-testid="career-chat-message-input"
          />
          {!pilotPresentation ? (
            <p data-testid="career-chat-character-counter">
              {messageLength}/{CAREER_CHAT_MAX_MESSAGE_LENGTH}
            </p>
          ) : null}
        </div>

        <label className="flex items-start gap-3 rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-3 py-3 text-sm text-[color:var(--af-text-muted)]">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0"
            checked={explicitConsent}
            onChange={(event) => onConsentChange(event.target.checked)}
            data-testid="career-chat-consent-checkbox"
          />
          <span>{pilotPresentation ? CAREER_PILOT_CONSENT_LABEL : CAREER_CHAT_WORKSPACE_CONSENT_LABEL}</span>
        </label>

        <ApplyFlowButton
          type="button"
          variant="primary"
          size={pilotPresentation ? "lg" : "sm"}
          className={pilotPresentation ? "w-full sm:w-auto" : undefined}
          disabled={submitDisabled || isSending}
          onClick={onSend}
          data-testid="career-chat-send-button"
        >
          {isSending ? "Enviando…" : pilotPresentation ? CAREER_PILOT_SEND_LABEL : CAREER_CHAT_WORKSPACE_SEND_LABEL}
        </ApplyFlowButton>

        {pilotPresentation && isSending ? <CareerAnalysisLoading intent={action} /> : null}

        {emptyMessage && !(pilotPresentation && isSending) ? (
          <p role="status" className="text-sm text-[color:var(--af-text-muted)]" data-testid="career-chat-status-message">
            {emptyMessage}
          </p>
        ) : null}

        {errorMessage ? (
          pilotPresentation ? (
            <CareerAnalysisError
              onRetry={() => {
                onDismissError?.();
                onSend();
              }}
            />
          ) : (
            <p role="alert" className="text-amber-200/90" data-testid="career-chat-error-message">
              {errorMessage}
            </p>
          )
        ) : null}

        {pilotResultModel ? (
          <CareerPilotResultView model={pilotResultModel} intent={action} />
        ) : null}

        {response?.agentResult && !pilotPresentation ? (
          <div className="space-y-2" data-testid="career-chat-agent-result">
            <p className="font-medium text-[color:var(--af-text)]">Agent response</p>
            <p>Status: {response.agentResult.status}</p>
            <p>Agent: {response.agentResult.agent}</p>
            <p>Summary: {response.agentResult.summary}</p>
          </div>
        ) : null}

        {!pilotPresentation && resumeAnalysis ? (
          <div className="space-y-1" data-testid="career-chat-resume-analysis">
            <p className="font-medium text-[color:var(--af-text)]">Resume analysis</p>
            <p>Score: {resumeAnalysis.score}/100</p>
            <p>Strengths: {resumeAnalysis.strengths.join("; ") || "—"}</p>
            <p>Weaknesses: {resumeAnalysis.weaknesses.join("; ") || "—"}</p>
            <p>Risks: {resumeAnalysis.risks.join("; ") || "—"}</p>
            <p>Recommendations: {resumeAnalysis.sectionRecommendations.join("; ") || "—"}</p>
          </div>
        ) : null}

        {!pilotPresentation && atsAnalysis ? (
          <div className="space-y-1" data-testid="career-chat-ats-analysis">
            <p className="font-medium text-[color:var(--af-text)]">ATS analysis</p>
            <p>Compatibility score: {atsAnalysis.compatibilityScore}/100</p>
            <p>Matched keywords: {atsAnalysis.matchedKeywords.join(", ") || "—"}</p>
            <p>Missing keywords: {atsAnalysis.missingKeywords.join(", ") || "—"}</p>
            <p>Structure risks: {atsAnalysis.structureRisks.join("; ") || "—"}</p>
            <p>Recommendations: {atsAnalysis.recommendations.join("; ") || "—"}</p>
          </div>
        ) : null}

        {!pilotPresentation && careerStrategyPlan ? (
          <div className="space-y-1" data-testid="career-chat-strategy-plan">
            <p className="font-medium text-[color:var(--af-text)]">Career strategy plan</p>
            <p>Positioning: {careerStrategyPlan.positioningSummary}</p>
            <p>
              Priority roles:{" "}
              {careerStrategyPlan.priorityRoles
                .map((role) => `${role.role} (${role.readiness})`)
                .join(", ") || "—"}
            </p>
            <p>
              Skill priorities:{" "}
              {careerStrategyPlan.skillPriorities
                .map((item) => `${item.skill} (${item.priority})`)
                .join(", ") || "—"}
            </p>
            <p>30-day: {careerStrategyPlan.thirtyDayPlan.join("; ") || "—"}</p>
            <p>Risks: {careerStrategyPlan.risks.join("; ") || "—"}</p>
          </div>
        ) : null}

        {reviewProposal && !pilotPresentation ? (
          <div className="space-y-1" data-testid="career-chat-review-proposal">
            <p className="font-medium text-[color:var(--af-text)]">Review proposal</p>
            <p>{reviewProposal.title}</p>
            <p>Proposal tool: {reviewProposal.proposalTool}</p>
            <p>Export tool: {reviewProposal.exportTool}</p>
            <p>Executed: {String(reviewProposal.executed)}</p>
          </div>
        ) : null}

        {toolProposals.length > 0 && !pilotPresentation ? (
          <div className="space-y-2" data-testid="career-chat-tool-proposals">
            <p className="font-medium text-[color:var(--af-text)]">Tool proposals</p>
            <ul className="space-y-2">
              {toolProposals.map((proposal) => (
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

        {selectedProposal && !pilotPresentation ? (
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

        {response?.trace && !pilotPresentation ? (
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

        {pilotPresentation && response?.status === "completed" && onSubmitPilotFeedback ? (
          <CareerPilotFeedback onSubmit={onSubmitPilotFeedback} />
        ) : null}

        {!pilotPresentation && pilotMode && response?.status === "completed" ? (
          <div className="space-y-1.5" data-testid="career-chat-feedback">
            <p className="font-medium text-[color:var(--af-text)]">
              {CAREER_CHAT_WORKSPACE_FEEDBACK_PROMPT}
            </p>
            {feedbackSubmitted ? (
              <p role="status" data-testid="career-chat-feedback-thanks">
                {CAREER_CHAT_WORKSPACE_FEEDBACK_THANKS}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <ApplyFlowButton
                  type="button"
                  variant="outlineBrand"
                  size="sm"
                  onClick={() => onSubmitFeedback?.("helpful")}
                  data-testid="career-chat-feedback-helpful"
                >
                  {CAREER_CHAT_WORKSPACE_FEEDBACK_HELPFUL_LABEL}
                </ApplyFlowButton>
                <ApplyFlowButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSubmitFeedback?.("partially_helpful")}
                  data-testid="career-chat-feedback-partial"
                >
                  {CAREER_CHAT_WORKSPACE_FEEDBACK_PARTIAL_LABEL}
                </ApplyFlowButton>
                <ApplyFlowButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSubmitFeedback?.("not_helpful")}
                  data-testid="career-chat-feedback-not-helpful"
                >
                  {CAREER_CHAT_WORKSPACE_FEEDBACK_NOT_HELPFUL_LABEL}
                </ApplyFlowButton>
              </div>
            )}
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
  pilotPresentation = false,
  pilotIntent,
  initialSpecialistFields,
  simpleInputs: simpleInputsProp,
  onSimpleInputsChange,
  onPilotActionChange,
  onPilotAnalysisComplete,
}: CareerChatWorkspaceProps) {
  const [action, setAction] = useState<CareerChatIntent>(
    pilotPresentation ? (pilotIntent ?? "analyze_resume") : "prepare_interview",
  );
  const [message, setMessage] = useState(
    pilotPresentation ? CAREER_PILOT_DEFAULT_MESSAGE : "Focus on frontend architecture",
  );
  const [explicitConsent, setExplicitConsent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<CareerChatResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<CareerChatToolProposal | null>(null);
  const [approvedOnce, setApprovedOnce] = useState(false);
  const [specialistFields, setSpecialistFields] = useState<CareerSpecialistFields>(
    initialSpecialistFields ?? EMPTY_SPECIALIST_FIELDS,
  );
  const [localSimpleInputs, setLocalSimpleInputs] = useState<CareerPilotSimpleInputs>(
    simpleInputsProp ?? EMPTY_CAREER_PILOT_SIMPLE_INPUTS,
  );
  const [reviewOverrides, setReviewOverrides] = useState<Partial<CareerSpecialistFields> | null>(
    null,
  );
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const pilotMode = pilotPresentation || isCareerPilotModeClient();

  const simpleInputs = simpleInputsProp ?? localSimpleInputs;

  function handleSimpleInputsChange(next: CareerPilotSimpleInputs) {
    if (onSimpleInputsChange) {
      onSimpleInputsChange(next);
    } else {
      setLocalSimpleInputs(next);
    }
    setReviewOverrides(null);
  }

  const normalizedFields = useMemo(() => {
    if (!pilotPresentation || !isCareerPilotIntent(action)) {
      return specialistFields;
    }
    return buildCareerSpecialistFieldsFromSimpleInputs(simpleInputs, action);
  }, [action, pilotPresentation, simpleInputs, specialistFields]);

  const effectiveSpecialistFields = useMemo(() => {
    if (!pilotPresentation) {
      return specialistFields;
    }
    if (!reviewOverrides) {
      return normalizedFields;
    }
    return { ...normalizedFields, ...reviewOverrides };
  }, [normalizedFields, pilotPresentation, reviewOverrides, specialistFields]);

  const pilotValidationMessage = useMemo(() => {
    if (!pilotPresentation || !isCareerPilotIntent(action) || explicitConsent) {
      return null;
    }
    if (action === "analyze_resume" || action === "analyze_ats_compatibility") {
      const resumeOk = hasSimplePilotAnalysisInputs("analyze_resume", simpleInputs);
      if (!resumeOk) {
        return CAREER_PILOT_EMPTY_RESUME_MESSAGE;
      }
    }
    if (action === "analyze_ats_compatibility") {
      const atsOk = hasSimplePilotAnalysisInputs("analyze_ats_compatibility", simpleInputs);
      if (!atsOk) {
        return CAREER_PILOT_EMPTY_JOB_MESSAGE;
      }
    }
    if (action === "plan_career_strategy" && !simpleInputs.careerGoal.trim()) {
      return CAREER_PILOT_EMPTY_CAREER_GOAL_MESSAGE;
    }
    return null;
  }, [action, explicitConsent, pilotPresentation, simpleInputs]);

  useEffect(() => {
    if (!pilotPresentation || !pilotIntent || !isCareerPilotIntent(pilotIntent)) {
      return;
    }
    setAction(pilotIntent);
  }, [pilotIntent, pilotPresentation]);

  const effectiveBundle = useMemo(() => {
    if (careerBundle && careerBundle.applications.length > 0) {
      return careerBundle;
    }
    if (!pilotPresentation || !isCareerPilotIntent(action)) {
      return null;
    }
    if (!hasPilotAnalysisInputs(action, effectiveSpecialistFields)) {
      return null;
    }
    return buildPilotCareerBundleFromFields(effectiveSpecialistFields);
  }, [action, careerBundle, effectiveSpecialistFields, pilotPresentation]);

  const hasBundle = pilotPresentation
    ? effectiveBundle != null
    : careerBundle != null && careerBundle.applications.length > 0;

  const uiState = useMemo(
    () =>
      resolveUiState({
        hasBundle,
        explicitConsent,
        isSending,
        response,
        errorMessage,
        pilotPresentation,
      }),
    [errorMessage, explicitConsent, hasBundle, isSending, pilotPresentation, response],
  );

  const submitDisabled = pilotPresentation
    ? !explicitConsent ||
      !isCareerPilotIntent(action) ||
      !hasSimplePilotAnalysisInputs(action, simpleInputs)
    : !careerBundle || !explicitConsent || !message.trim();

  function handleActionChange(nextAction: CareerChatIntent) {
    setAction(nextAction);
    onPilotActionChange?.(nextAction);
  }

  async function handleSend() {
    if (!effectiveBundle || !explicitConsent) {
      return;
    }

    const outboundMessage = message.trim() || (pilotPresentation ? CAREER_PILOT_DEFAULT_MESSAGE : "");
    if (!pilotPresentation && !outboundMessage) {
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    setResponse(null);
    setSelectedProposal(null);
    setApprovedOnce(false);
    setFeedbackSubmitted(false);

    try {
      const analysisInput = buildSpecialistAnalysisInput({
        action,
        fields: effectiveSpecialistFields,
        mainStack: effectiveBundle.candidate?.mainStack ?? [],
        fallbackRole:
          effectiveBundle.candidate?.targetRole ?? effectiveBundle.applications[0]?.role ?? "",
      });

      const nextResponse = await runCareerChatLibrechat({
        action,
        message: outboundMessage,
        explicitConsent: true,
        context: {
          careerBundle: effectiveBundle,
          selectedSignalIds,
          availableSignals,
          ...(analysisInput ? { analysisInput } : {}),
        },
      });

      if (nextResponse.status !== "completed" && nextResponse.status !== "blocked") {
        throw new CareerChatRequestError();
      }

      setResponse(nextResponse);
      if (
        pilotPresentation &&
        nextResponse.status === "completed" &&
        isCareerPilotIntent(action)
      ) {
        onPilotAnalysisComplete?.(action);
      }
    } catch {
      setResponse(null);
      setErrorMessage(
        pilotPresentation
          ? `${CAREER_PILOT_ERROR_TITLE} ${CAREER_PILOT_ERROR_DESCRIPTION}`
          : "Career chat adapter failed safely.",
      );
    } finally {
      setIsSending(false);
    }
  }

  const orchestration =
    response?.agentResult?.status === "completed" && effectiveBundle
      ? {
          intent: action,
          explicitConsent: true as const,
          context: {
            careerBundle: effectiveBundle,
            selectedSignalIds,
            availableSignals,
          },
        }
      : null;

  return (
    <>
      <CareerChatWorkspaceView
        careerBundle={effectiveBundle}
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
        onActionChange={handleActionChange}
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
        specialistFields={effectiveSpecialistFields}
        onSpecialistFieldChange={(field, value) => {
          if (pilotPresentation) {
            setReviewOverrides((current) => ({
              ...(current ?? normalizedFields),
              [field]: value,
            }));
            return;
          }
          setSpecialistFields((current) => ({ ...current, [field]: value }));
        }}
        simpleInputs={pilotPresentation ? simpleInputs : undefined}
        onSimpleInputsChange={pilotPresentation ? handleSimpleInputsChange : undefined}
        validationMessage={pilotValidationMessage}
        pilotMode={pilotMode}
        pilotPresentation={pilotPresentation}
        submitDisabled={submitDisabled}
        onDismissError={() => setErrorMessage(null)}
        onSubmitPilotFeedback={
          pilotPresentation
            ? async (input) =>
                submitCareerFeedback({
                  rating: input.rating,
                  category: careerFeedbackCategoryForIntent(action),
                  consentToStore: input.consentToStore,
                })
            : undefined
        }
        feedbackSubmitted={feedbackSubmitted}
        onSubmitFeedback={(rating) => {
          setFeedbackSubmitted(true);
          void submitCareerFeedback({
            rating,
            category: careerFeedbackCategoryForIntent(action),
            consentToStore: false,
          });
        }}
      />

      {!pilotPresentation &&
      approvedOnce &&
      selectedProposal &&
      orchestration &&
      effectiveBundle &&
      response?.agentResult?.status === "completed" ? (
        <CareerToolPermissionReview
          agentResult={response.agentResult}
          orchestration={orchestration}
          agentRequestId={deriveCareerAgentRequestId({
            intent: action,
            careerBundle: effectiveBundle,
            selectedSignalIds,
          })}
        />
      ) : null}
    </>
  );
}
