import type { CareerAgentExecutionPlan, CareerAgentIntent } from "../career-agents/types.js";
import { CAREER_TOOL_REGISTRY } from "../career-tools/registry.js";
import type { CareerToolName } from "../career-tools/types.js";
import type { CareerChatNormalizedInput, CareerChatToolProposal, CareerChatToolProposalStatus } from "./types.js";

const TOOLS_BY_INTENT: Record<CareerAgentIntent, CareerToolName[]> = {
  analyze_application_fit: ["career.derive_fit_summary", "career.create_review_proposal"],
  analyze_profile_gaps: ["career.derive_gap_analysis", "career.create_review_proposal"],
  prepare_interview: ["career.derive_interview_plan", "career.create_review_proposal"],
  analyze_resume: ["career.create_review_proposal", "career.export_review_payload"],
  analyze_ats_compatibility: ["career.create_review_proposal", "career.export_review_payload"],
  plan_career_strategy: ["career.create_review_proposal", "career.export_review_payload"],
};

function buildInputPreview(
  toolName: CareerToolName,
  input: CareerChatNormalizedInput,
): Record<string, unknown> {
  const firstApp = input.context.careerBundle.applications[0];
  switch (toolName) {
    case "career.derive_fit_summary":
    case "career.derive_interview_plan":
      return { applicationId: firstApp?.id ?? "unknown" };
    case "career.derive_gap_analysis":
      return {
        targetRole: input.context.careerBundle.candidate?.targetRole ?? firstApp?.role ?? "Role",
        requiredSkills: firstApp?.requiredSkills ?? [],
      };
    case "career.create_review_proposal":
      return { sourceResultId: input.conversationId, proposalType: "fit_summary" };
    default:
      return {};
  }
}

function resolveProposalStatus(input: {
  allowed: boolean;
  requiresExplicitApproval: boolean;
  agentCompleted: boolean;
}): CareerChatToolProposalStatus {
  if (!input.allowed) {
    return "blocked";
  }

  if (input.requiresExplicitApproval) {
    return "approval_required";
  }

  if (input.agentCompleted) {
    return "ready_for_review";
  }

  return "proposed";
}

export function resolveCareerChatToolProposals(input: {
  intent: CareerAgentIntent;
  normalized: CareerChatNormalizedInput;
  executionPlan: CareerAgentExecutionPlan | undefined;
  agentCompleted: boolean;
}): CareerChatToolProposal[] {
  const toolNames = TOOLS_BY_INTENT[input.intent];

  return toolNames.map((toolName) => {
    const definition = CAREER_TOOL_REGISTRY[toolName];
    const allowed = input.executionPlan?.allowedCapabilities.includes(definition.requiredCapability) ?? false;

    return {
      toolName,
      description: definition.description,
      requiredCapability: definition.requiredCapability,
      riskLevel: definition.riskLevel,
      requiresExplicitApproval: definition.requiresExplicitApproval,
      inputPreview: buildInputPreview(toolName, input.normalized),
      status: resolveProposalStatus({
        allowed,
        requiresExplicitApproval: definition.requiresExplicitApproval,
        agentCompleted: input.agentCompleted,
      }),
    };
  });
}
