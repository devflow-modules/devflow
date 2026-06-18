import { resolveCareerToolDefinition } from "../career-tools/registry.js";
import type { CareerToolName } from "../career-tools/types.js";
import { CAREER_AUTOMATION_KIND_MAP } from "./constants.js";
import type { CareerAutomationContext, CareerAutomationKind, CareerAutomationProposal } from "./types.js";

export function deriveCareerAutomationProposalId(input: {
  kind: CareerAutomationKind;
  agentRequestId: string;
}): string {
  return ["career-automation", input.kind, input.agentRequestId].join("::");
}

/**
 * Builds the deterministic, client-safe tool input for an automation kind from the
 * sanitized context. The client never authors this input.
 */
export function buildCareerAutomationToolInput(
  kind: CareerAutomationKind,
  context: CareerAutomationContext,
): Record<string, unknown> {
  const firstApplication = context.careerBundle.applications[0];

  switch (kind) {
    case "prepare_application_review":
      return { applicationId: firstApplication?.id ?? "unknown" };
    case "prepare_profile_gap_review":
      return {
        targetRole:
          context.careerBundle.candidate?.targetRole ?? firstApplication?.role ?? "Target role",
        requiredSkills:
          firstApplication?.requiredSkills && firstApplication.requiredSkills.length > 0
            ? firstApplication.requiredSkills
            : ["communication"],
      };
    case "prepare_interview_plan":
      return { applicationId: firstApplication?.id ?? "unknown" };
    case "prepare_review_export":
      return { payloadType: "fit_summary", format: "json" };
  }
}

export function resolveCareerAutomationProposal(input: {
  kind: CareerAutomationKind;
  agentRequestId: string;
  context: CareerAutomationContext;
}): CareerAutomationProposal {
  const mapping = CAREER_AUTOMATION_KIND_MAP[input.kind];
  const tool: CareerToolName = mapping.tool;
  const definition = resolveCareerToolDefinition(tool)!;
  const proposalId = deriveCareerAutomationProposalId({
    kind: input.kind,
    agentRequestId: input.agentRequestId,
  });

  return {
    proposalId,
    kind: input.kind,
    title: mapping.title,
    description: mapping.description,
    requestedTool: tool,
    requiredCapability: mapping.requiredCapability,
    riskLevel: definition.riskLevel,
    requiresExplicitApproval: definition.requiresExplicitApproval,
    inputPreview: buildCareerAutomationToolInput(input.kind, input.context),
    reviewRequired: true,
  };
}
