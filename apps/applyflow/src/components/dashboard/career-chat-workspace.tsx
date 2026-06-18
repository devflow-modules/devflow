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
  CAREER_CHAT_WORKSPACE_SPECIALIST_LABEL,
  CAREER_CHAT_WORKSPACE_RESUME_BULLETS_LABEL,
  CAREER_CHAT_WORKSPACE_RESUME_SKILLS_LABEL,
  CAREER_CHAT_WORKSPACE_JOB_REQUIREMENTS_LABEL,
  CAREER_CHAT_WORKSPACE_TARGET_ROLES_LABEL,
  CAREER_CHAT_WORKSPACE_AVAILABILITY_LABEL,
} from "./career-chat-workspace-content";

const SPECIALIST_INTENTS: CareerChatIntent[] = [
  "analyze_resume",
  "analyze_ats_compatibility",
  "plan_career_strategy",
];

function isSpecialistIntent(action: CareerChatIntent): boolean {
  return SPECIALIST_INTENTS.includes(action);
}

export type CareerSpecialistFields = {
  resumeBullets: string;
  resumeSkills: string;
  jobRequirements: string;
  targetRoles: string;
  availability: string;
};

export const EMPTY_SPECIALIST_FIELDS: CareerSpecialistFields = {
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
  const resumeSnapshot = {
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
        keywords: requirements.flatMap((req) =>
          req
            .toLowerCase()
            .split(/[^a-z0-9+#.]+/)
            .filter((token) => token.length >= 3),
        ),
      },
    };
  }

  return {
    targetRoles: toCommaList(fields.targetRoles),
    availability: fields.availability.trim() || undefined,
  };
}
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
  specialistFields = EMPTY_SPECIALIST_FIELDS,
  onSpecialistFieldChange,
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
}) {
  const messageLength = message.length;
  const showSpecialist = isSpecialistIntent(action);
  const resumeAnalysis = response?.agentResult?.resumeAnalysis;
  const atsAnalysis = response?.agentResult?.atsAnalysis;
  const careerStrategyPlan = response?.agentResult?.careerStrategyPlan;
  const reviewProposal = response?.agentResult?.reviewProposal;
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

        {showSpecialist ? (
          <div
            className="space-y-2 rounded-[var(--af-radius-sm)] border border-violet-500/25 p-2"
            data-testid="career-chat-specialist-inputs"
          >
            <p className="font-medium text-[color:var(--af-text)]">
              {CAREER_CHAT_WORKSPACE_SPECIALIST_LABEL}
            </p>
            {action !== "plan_career_strategy" ? (
              <>
                <label htmlFor="career-chat-resume-bullets" className="block">
                  {CAREER_CHAT_WORKSPACE_RESUME_BULLETS_LABEL}
                </label>
                <textarea
                  id="career-chat-resume-bullets"
                  className="min-h-[64px] w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface)] px-2 py-1.5 text-[11px] text-[color:var(--af-text)]"
                  value={specialistFields.resumeBullets}
                  onChange={(event) => onSpecialistFieldChange?.("resumeBullets", event.target.value)}
                  data-testid="career-chat-resume-bullets"
                />
                <label htmlFor="career-chat-resume-skills" className="block">
                  {CAREER_CHAT_WORKSPACE_RESUME_SKILLS_LABEL}
                </label>
                <input
                  id="career-chat-resume-skills"
                  className="w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface)] px-2 py-1.5 text-[11px] text-[color:var(--af-text)]"
                  value={specialistFields.resumeSkills}
                  onChange={(event) => onSpecialistFieldChange?.("resumeSkills", event.target.value)}
                  data-testid="career-chat-resume-skills"
                />
              </>
            ) : null}
            {action === "analyze_ats_compatibility" ? (
              <>
                <label htmlFor="career-chat-job-requirements" className="block">
                  {CAREER_CHAT_WORKSPACE_JOB_REQUIREMENTS_LABEL}
                </label>
                <textarea
                  id="career-chat-job-requirements"
                  className="min-h-[64px] w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface)] px-2 py-1.5 text-[11px] text-[color:var(--af-text)]"
                  value={specialistFields.jobRequirements}
                  onChange={(event) => onSpecialistFieldChange?.("jobRequirements", event.target.value)}
                  data-testid="career-chat-job-requirements"
                />
              </>
            ) : null}
            {action === "plan_career_strategy" ? (
              <>
                <label htmlFor="career-chat-target-roles" className="block">
                  {CAREER_CHAT_WORKSPACE_TARGET_ROLES_LABEL}
                </label>
                <input
                  id="career-chat-target-roles"
                  className="w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface)] px-2 py-1.5 text-[11px] text-[color:var(--af-text)]"
                  value={specialistFields.targetRoles}
                  onChange={(event) => onSpecialistFieldChange?.("targetRoles", event.target.value)}
                  data-testid="career-chat-target-roles"
                />
                <label htmlFor="career-chat-availability" className="block">
                  {CAREER_CHAT_WORKSPACE_AVAILABILITY_LABEL}
                </label>
                <input
                  id="career-chat-availability"
                  className="w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)] bg-[color:var(--af-surface)] px-2 py-1.5 text-[11px] text-[color:var(--af-text)]"
                  value={specialistFields.availability}
                  onChange={(event) => onSpecialistFieldChange?.("availability", event.target.value)}
                  data-testid="career-chat-availability"
                />
              </>
            ) : null}
          </div>
        ) : null}

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

        {resumeAnalysis ? (
          <div className="space-y-1" data-testid="career-chat-resume-analysis">
            <p className="font-medium text-[color:var(--af-text)]">Resume analysis</p>
            <p>Score: {resumeAnalysis.score}/100</p>
            <p>Strengths: {resumeAnalysis.strengths.join("; ") || "—"}</p>
            <p>Weaknesses: {resumeAnalysis.weaknesses.join("; ") || "—"}</p>
            <p>Risks: {resumeAnalysis.risks.join("; ") || "—"}</p>
            <p>Recommendations: {resumeAnalysis.sectionRecommendations.join("; ") || "—"}</p>
          </div>
        ) : null}

        {atsAnalysis ? (
          <div className="space-y-1" data-testid="career-chat-ats-analysis">
            <p className="font-medium text-[color:var(--af-text)]">ATS analysis</p>
            <p>Compatibility score: {atsAnalysis.compatibilityScore}/100</p>
            <p>Matched keywords: {atsAnalysis.matchedKeywords.join(", ") || "—"}</p>
            <p>Missing keywords: {atsAnalysis.missingKeywords.join(", ") || "—"}</p>
            <p>Structure risks: {atsAnalysis.structureRisks.join("; ") || "—"}</p>
            <p>Recommendations: {atsAnalysis.recommendations.join("; ") || "—"}</p>
          </div>
        ) : null}

        {careerStrategyPlan ? (
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

        {reviewProposal ? (
          <div className="space-y-1" data-testid="career-chat-review-proposal">
            <p className="font-medium text-[color:var(--af-text)]">Review proposal</p>
            <p>{reviewProposal.title}</p>
            <p>Proposal tool: {reviewProposal.proposalTool}</p>
            <p>Export tool: {reviewProposal.exportTool}</p>
            <p>Executed: {String(reviewProposal.executed)}</p>
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
  const [specialistFields, setSpecialistFields] = useState<CareerSpecialistFields>(
    EMPTY_SPECIALIST_FIELDS,
  );

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
      const analysisInput = buildSpecialistAnalysisInput({
        action,
        fields: specialistFields,
        mainStack: careerBundle.candidate?.mainStack ?? [],
        fallbackRole:
          careerBundle.candidate?.targetRole ?? careerBundle.applications[0]?.role ?? "",
      });

      const nextResponse = await runCareerChatLibrechat({
        action,
        message: message.trim(),
        explicitConsent: true,
        context: {
          careerBundle,
          selectedSignalIds,
          availableSignals,
          ...(analysisInput ? { analysisInput } : {}),
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
        specialistFields={specialistFields}
        onSpecialistFieldChange={(field, value) =>
          setSpecialistFields((current) => ({ ...current, [field]: value }))
        }
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
