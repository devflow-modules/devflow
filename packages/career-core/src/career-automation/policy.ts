import type { CareerAgentExecutionPlan } from "../career-agents/types.js";
import { evaluateCareerToolPermission } from "../career-tools/permission.js";
import { isCareerToolName, resolveCareerToolDefinition } from "../career-tools/registry.js";
import type { CareerToolApproval, CareerToolPermissionBlockCode } from "../career-tools/types.js";
import {
  CAREER_AUTOMATION_ALLOWED_RISK_LEVELS,
  CAREER_AUTOMATION_KIND_MAP,
  CAREER_AUTOMATION_PROVIDERS,
} from "./constants.js";
import { scanCareerAutomationPayloadForForbiddenKeys } from "./security.js";
import type {
  CareerAutomationApproval,
  CareerAutomationExecutionPlan,
  CareerAutomationKind,
  CareerAutomationPolicyBlockCode,
  CareerAutomationPolicyDecision,
  CareerAutomationProposal,
  CareerAutomationProvider,
} from "./types.js";

function mapToolPermissionCode(code: CareerToolPermissionBlockCode | undefined): CareerAutomationPolicyBlockCode {
  switch (code) {
    case "capability_not_allowed":
      return "automation_capability_not_allowed";
    case "tool_not_allowed":
      return "automation_tool_not_allowed";
    case "explicit_approval_required":
      return "explicit_approval_required";
    case "unsafe_tool_context":
      return "unsafe_automation_context";
    case "execution_plan_not_available":
      return "execution_plan_not_available";
    case "unsupported_tool":
    case "blocked_tool":
    case "agent_tool_mismatch":
    case "execution_not_supported":
    case "invalid_tool_input":
    default:
      return "automation_not_allowed";
  }
}

function isSupportedAutomationKind(kind: string): kind is CareerAutomationKind {
  return kind in CAREER_AUTOMATION_KIND_MAP;
}

export function evaluateCareerAutomationPolicy(input: {
  proposal: CareerAutomationProposal;
  approval: CareerAutomationApproval;
  toolApproval?: CareerToolApproval;
  executionPlan: CareerAgentExecutionPlan | null;
  toolInput: unknown;
  contextPayload: unknown;
  provider: CareerAutomationProvider;
  automationEnabled: boolean;
}): CareerAutomationPolicyDecision {
  if (!input.automationEnabled) {
    return {
      allowed: false,
      code: "automation_disabled",
      message: "Approved automation boundary is disabled by feature flag.",
    };
  }

  if (!CAREER_AUTOMATION_PROVIDERS.includes(input.provider)) {
    return {
      allowed: false,
      code: "unsupported_automation_provider",
      message: "Automation provider is not allowlisted.",
    };
  }

  if (!isSupportedAutomationKind(input.proposal.kind)) {
    return {
      allowed: false,
      code: "unsupported_automation_kind",
      message: "Automation kind is not supported.",
    };
  }

  if (!isCareerToolName(input.proposal.requestedTool)) {
    return {
      allowed: false,
      code: "automation_tool_not_allowed",
      message: "Resolved tool is not registered.",
    };
  }

  const definition = resolveCareerToolDefinition(input.proposal.requestedTool)!;
  if (!CAREER_AUTOMATION_ALLOWED_RISK_LEVELS.includes(definition.riskLevel as never)) {
    return {
      allowed: false,
      code: "automation_not_allowed",
      message: "Automation tool is destructive or blocked.",
    };
  }

  if (scanCareerAutomationPayloadForForbiddenKeys(input.contextPayload).length > 0) {
    return {
      allowed: false,
      code: "unsafe_automation_context",
      message: "Automation context contains unsafe fields.",
    };
  }

  if (!input.executionPlan) {
    return {
      allowed: false,
      code: "execution_plan_not_available",
      message: "Agent execution plan could not be reconstructed.",
    };
  }

  if (input.approval.approved !== true) {
    return {
      allowed: false,
      code: "explicit_approval_required",
      message: "Automation approval must be explicitly granted.",
    };
  }

  if (input.approval.proposalId !== input.proposal.proposalId) {
    return {
      allowed: false,
      code: "approval_proposal_mismatch",
      message: "Approval does not correspond to the resolved proposal.",
    };
  }

  if (input.toolApproval && input.toolApproval.toolName !== input.proposal.requestedTool) {
    return {
      allowed: false,
      code: "approval_tool_mismatch",
      message: "Approval does not correspond to the resolved tool.",
    };
  }

  if (input.proposal.requiresExplicitApproval && !input.toolApproval) {
    return {
      allowed: false,
      code: "explicit_approval_required",
      message: "Explicit approval is required for export automations.",
    };
  }

  const permission = evaluateCareerToolPermission({
    toolName: input.proposal.requestedTool,
    inputPayload: input.toolInput,
    approval: input.toolApproval,
    executionPlan: input.executionPlan,
    contextPayload: input.contextPayload,
  });

  if (!permission.allowed) {
    return {
      allowed: false,
      code: mapToolPermissionCode(permission.code),
      message: permission.message ?? "Automation tool permission denied.",
    };
  }

  return { allowed: true };
}

export function buildCareerAutomationExecutionPlan(input: {
  proposal: CareerAutomationProposal;
  allowed: boolean;
  blockedReasons: string[];
}): CareerAutomationExecutionPlan {
  return {
    proposalId: input.proposal.proposalId,
    kind: input.proposal.kind,
    selectedTool: input.proposal.requestedTool,
    requiredCapability: input.proposal.requiredCapability,
    allowed: input.allowed,
    blockedReasons: input.blockedReasons,
    requiresExplicitApproval: input.proposal.requiresExplicitApproval,
    reviewRequired: true,
  };
}
