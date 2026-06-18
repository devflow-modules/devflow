"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  resolveCareerToolDefinition,
  type CareerAgentOrchestrationBody,
  type CareerAgentResult,
  type CareerToolExecutionResult,
  type CareerToolName,
} from "@devflow/career-core";
import { useMemo, useState } from "react";
import {
  CAREER_TOOL_PERMISSION_APPROVE_ONCE_LABEL,
  CAREER_TOOL_PERMISSION_CANCEL_LABEL,
  CAREER_TOOL_PERMISSION_COPY_LABEL,
  CAREER_TOOL_PERMISSION_EXPORT_PREVIEW_LABEL,
  CAREER_TOOL_PERMISSION_REVIEW_DISCLAIMER,
  CAREER_TOOL_PERMISSION_REVIEW_TITLE,
  CAREER_TOOL_PERMISSION_RUN_LABEL,
} from "./career-tool-permission-review-content";
import { runCareerToolInvoke } from "./career-tool-permission-review-client";

export function CareerToolPermissionReviewView({
  toolName,
  agentResult,
  orchestration,
  agentRequestId,
  toolResult,
  approvedOnce,
  isRunning,
  onApproveOnce,
  onCancel,
  onRunApprovedTool,
  onCopyResult,
}: {
  toolName: CareerToolName;
  agentResult: CareerAgentResult;
  orchestration: CareerAgentOrchestrationBody;
  agentRequestId: string;
  toolResult: CareerToolExecutionResult | null;
  approvedOnce: boolean;
  isRunning: boolean;
  onApproveOnce: () => void;
  onCancel: () => void;
  onRunApprovedTool: () => void;
  onCopyResult: () => void;
}) {
  const definition = resolveCareerToolDefinition(toolName);
  const allowed = agentResult.executionPlan?.allowedCapabilities.includes(
    definition?.requiredCapability ?? "read_career_bundle",
  );
  const blocked = !allowed || agentResult.status !== "completed";

  return (
    <ApplyFlowCard
      variant="default"
      padding="sm"
      className="border border-sky-500/25 bg-sky-950/10"
      data-testid="career-tool-permission-review-panel"
    >
      <div className="space-y-3 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-semibold text-sky-100/95">{CAREER_TOOL_PERMISSION_REVIEW_TITLE}</h3>
          <ApplyFlowBadge tone="intel">Manual review</ApplyFlowBadge>
        </div>

        <p data-testid="career-tool-permission-disclaimer">{CAREER_TOOL_PERMISSION_REVIEW_DISCLAIMER}</p>

        <p>
          Tool: <span className="font-medium text-[color:var(--af-text)]">{toolName}</span>
        </p>
        <p>{definition?.description}</p>
        <p>
          Required capability:{" "}
          <span className="font-medium text-[color:var(--af-text)]">{definition?.requiredCapability}</span>
        </p>
        <p>
          Risk level:{" "}
          <span className="font-medium text-[color:var(--af-text)]">{definition?.riskLevel}</span>
        </p>
        <p>
          Execution mode:{" "}
          <span className="font-medium text-[color:var(--af-text)]">{definition?.executionMode}</span>
        </p>
        <p>
          Approval required:{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {definition?.requiresExplicitApproval ? "yes" : "no"}
          </span>
        </p>
        <p data-testid="career-tool-permission-status">
          Status:{" "}
          <span className="font-medium text-[color:var(--af-text)]">
            {blocked ? "blocked" : allowed ? "allowed" : "blocked"}
          </span>
        </p>

        <div className="flex flex-wrap gap-2">
          <ApplyFlowButton
            type="button"
            variant="outlineBrand"
            size="sm"
            disabled={blocked || definition?.requiresExplicitApproval === false ? false : approvedOnce}
            onClick={onApproveOnce}
            data-testid="career-tool-approve-once-button"
          >
            {CAREER_TOOL_PERMISSION_APPROVE_ONCE_LABEL}
          </ApplyFlowButton>
          <ApplyFlowButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            data-testid="career-tool-cancel-button"
          >
            {CAREER_TOOL_PERMISSION_CANCEL_LABEL}
          </ApplyFlowButton>
          <ApplyFlowButton
            type="button"
            variant="primary"
            size="sm"
            disabled={blocked || isRunning || (definition?.requiresExplicitApproval && !approvedOnce)}
            onClick={onRunApprovedTool}
            data-testid="career-tool-run-button"
          >
            {isRunning ? "Running…" : CAREER_TOOL_PERMISSION_RUN_LABEL}
          </ApplyFlowButton>
        </div>

        {toolResult ? (
          <div data-testid="career-tool-result">
            <p className="font-medium text-[color:var(--af-text)]">Tool result</p>
            <p>Status: {toolResult.status}</p>
            <ApplyFlowButton
              type="button"
              variant="outlineBrand"
              size="sm"
              onClick={onCopyResult}
              data-testid="career-tool-copy-result-button"
            >
              {CAREER_TOOL_PERMISSION_COPY_LABEL}
            </ApplyFlowButton>
            {toolResult.data.preview ? (
              <ApplyFlowButton
                type="button"
                variant="outlineBrand"
                size="sm"
                data-testid="career-tool-export-preview-button"
              >
                {CAREER_TOOL_PERMISSION_EXPORT_PREVIEW_LABEL}
              </ApplyFlowButton>
            ) : null}
            <ol className="list-inside list-decimal" data-testid="career-tool-trace">
              {toolResult.trace.steps.map((step) => (
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

function defaultToolForIntent(intent: CareerAgentOrchestrationBody["intent"]): CareerToolName {
  switch (intent) {
    case "analyze_application_fit":
      return "career.derive_fit_summary";
    case "analyze_profile_gaps":
      return "career.derive_gap_analysis";
    case "prepare_interview":
      return "career.derive_interview_plan";
    case "analyze_resume":
    case "analyze_ats_compatibility":
    case "plan_career_strategy":
    default:
      return "career.create_review_proposal";
  }
}

function defaultToolInput(
  toolName: CareerToolName,
  orchestration: CareerAgentOrchestrationBody,
): Record<string, unknown> {
  const firstApp = orchestration.context.careerBundle.applications[0];
  switch (toolName) {
    case "career.derive_fit_summary":
    case "career.derive_interview_plan":
      return { applicationId: firstApp?.id ?? "unknown" };
    case "career.derive_gap_analysis":
      return {
        targetRole: orchestration.context.careerBundle.candidate?.targetRole ?? firstApp?.role ?? "Role",
        requiredSkills: firstApp?.requiredSkills ?? [],
      };
    case "career.read_selected_signals":
      return { selectedSignalIds: orchestration.context.selectedSignalIds };
    default:
      return {};
  }
}

export function CareerToolPermissionReview({
  agentResult,
  orchestration,
  agentRequestId,
}: {
  agentResult: CareerAgentResult;
  orchestration: CareerAgentOrchestrationBody;
  agentRequestId: string;
}) {
  const toolName = useMemo(() => defaultToolForIntent(orchestration.intent), [orchestration.intent]);
  const [approvedOnce, setApprovedOnce] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [toolResult, setToolResult] = useState<CareerToolExecutionResult | null>(null);

  async function handleRunApprovedTool() {
    const definition = resolveCareerToolDefinition(toolName);
    setIsRunning(true);

    try {
      const result = await runCareerToolInvoke({
        agentRequestId,
        toolName,
        input: defaultToolInput(toolName, orchestration),
        explicitApproval: true,
        orchestration,
        approval:
          definition?.requiresExplicitApproval && approvedOnce
            ? {
                toolName,
                approved: true,
                approvedAt: new Date().toISOString(),
                approvalScope: "single_execution",
              }
            : undefined,
      });
      setToolResult(result);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <CareerToolPermissionReviewView
      toolName={toolName}
      agentResult={agentResult}
      orchestration={orchestration}
      agentRequestId={agentRequestId}
      toolResult={toolResult}
      approvedOnce={approvedOnce}
      isRunning={isRunning}
      onApproveOnce={() => setApprovedOnce(true)}
      onCancel={() => {
        setApprovedOnce(false);
        setToolResult(null);
      }}
      onRunApprovedTool={() => {
        void handleRunApprovedTool();
      }}
      onCopyResult={() => {
        if (toolResult) {
          void navigator.clipboard.writeText(JSON.stringify(toolResult, null, 2));
        }
      }}
    />
  );
}
