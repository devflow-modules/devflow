import { buildCareerAgentContext } from "../career-agents/context.js";
import { buildCareerAgentExecutionPlan, selectCareerAgent } from "../career-agents/execution-plan.js";
import { evaluateCareerAgentPolicy } from "../career-agents/policy.js";
import { buildCareerAgentRequest, deriveCareerAgentRequestId } from "../career-agents/request.js";
import type { CareerAgentOrchestrationBody } from "../career-agents/schemas.js";
import type { CareerAgentExecutionPlan } from "../career-agents/types.js";
import { isCareerAgentCapabilityAllowed } from "../career-agents/capability-resolution.js";
import { isCareerToolName, resolveCareerToolDefinition } from "./registry.js";
import type {
  CareerToolApproval,
  CareerToolDefinition,
  CareerToolPermission,
  CareerToolPermissionBlockCode,
} from "./types.js";
import { scanCareerAgentPayloadForForbiddenKeys } from "../career-agents/security.js";
import { parseCareerToolInput } from "./schemas.js";

export function validateCareerToolApproval(input: {
  approval: CareerToolApproval | undefined;
  toolName: string;
  requiresExplicitApproval: boolean;
}): CareerToolPermission {
  if (!input.requiresExplicitApproval) {
    return { allowed: true };
  }

  if (!input.approval) {
    return {
      allowed: false,
      code: "explicit_approval_required",
      message: "Explicit tool approval is required for export tools.",
    };
  }

  if (input.approval.toolName !== input.toolName) {
    return {
      allowed: false,
      code: "explicit_approval_required",
      message: "Approval scope does not match the requested tool.",
    };
  }

  if (input.approval.approved !== true) {
    return {
      allowed: false,
      code: "explicit_approval_required",
      message: "Tool approval must be explicitly granted.",
    };
  }

  return { allowed: true };
}

export function evaluateCareerToolPermission(input: {
  toolName: string;
  inputPayload: unknown;
  approval?: CareerToolApproval;
  executionPlan: CareerAgentExecutionPlan;
  contextPayload: unknown;
}): CareerToolPermission {
  if (!isCareerToolName(input.toolName)) {
    return {
      allowed: false,
      code: "unsupported_tool",
      message: "Tool is not registered.",
    };
  }

  const definition = resolveCareerToolDefinition(input.toolName)!;

  if (definition.executionMode === "blocked" || definition.riskLevel === "blocked") {
    return {
      allowed: false,
      code: "blocked_tool",
      message: "Tool is blocked by policy.",
    };
  }

  if (scanCareerAgentPayloadForForbiddenKeys(input.contextPayload).length > 0) {
    return {
      allowed: false,
      code: "unsafe_tool_context",
      message: "Tool context contains unsafe fields.",
    };
  }

  const parsedInput = parseCareerToolInput(input.toolName, input.inputPayload);
  if (!parsedInput.success) {
    return {
      allowed: false,
      code: "invalid_tool_input",
      message: "Tool input failed schema validation.",
    };
  }

  const capabilityOnPlan = input.executionPlan.allowedCapabilities.includes(definition.requiredCapability);
  const agentHasCapability = isCareerAgentCapabilityAllowed(
    input.executionPlan.selectedAgent,
    definition.requiredCapability,
  );

  if (!capabilityOnPlan && agentHasCapability) {
    return {
      allowed: false,
      code: "tool_not_allowed",
      message: "Tool is not allowed for the current execution plan.",
    };
  }

  if (!capabilityOnPlan) {
    return {
      allowed: false,
      code: "capability_not_allowed",
      message: "Execution plan does not allow the required capability.",
    };
  }

  if (!agentHasCapability) {
    return {
      allowed: false,
      code: "agent_tool_mismatch",
      message: "Selected agent cannot use the required capability for this tool.",
    };
  }

  const approval = validateCareerToolApproval({
    approval: input.approval,
    toolName: input.toolName,
    requiresExplicitApproval: definition.requiresExplicitApproval,
  });

  if (!approval.allowed) {
    return approval;
  }

  if (definition.executionMode !== "local_pure" && definition.executionMode !== "simulated") {
    return {
      allowed: false,
      code: "execution_not_supported",
      message: "Tool execution mode is not supported.",
    };
  }

  return { allowed: true };
}

export function resolveExecutionPlanFromOrchestration(
  orchestration: CareerAgentOrchestrationBody,
  agentRequestId: string,
):
  | { ok: true; executionPlan: CareerAgentExecutionPlan; requestId: string }
  | { ok: false; code: CareerToolPermissionBlockCode; message: string } {
  const request = buildCareerAgentRequest(orchestration);
  const context = buildCareerAgentContext(request);

  if (request.requestId !== agentRequestId) {
    return {
      ok: false,
      code: "execution_plan_not_available",
      message: "Agent request id does not match orchestration context.",
    };
  }

  const policy = evaluateCareerAgentPolicy(request, context);
  if (!policy.allowed) {
    return {
      ok: false,
      code: "execution_plan_not_available",
      message: policy.message ?? "Orchestration policy blocked plan reconstruction.",
    };
  }

  const selection = selectCareerAgent(request);
  if (!selection.ok) {
    return {
      ok: false,
      code: "execution_plan_not_available",
      message: selection.message,
    };
  }

  const executionPlan = buildCareerAgentExecutionPlan({
    agent: selection.agent,
    reason: selection.reason,
    intent: request.intent,
    context,
  });

  if (executionPlan.missingInputs.length > 0) {
    return {
      ok: false,
      code: "execution_plan_not_available",
      message: `Missing inputs: ${executionPlan.missingInputs.join(", ")}`,
    };
  }

  return { ok: true, executionPlan, requestId: deriveCareerAgentRequestId({
    intent: request.intent,
    careerBundle: request.context.careerBundle,
    selectedSignalIds: request.context.selectedSignalIds,
  }) };
}

export function buildToolExecutionPlan(definition: CareerToolDefinition): {
  toolName: CareerToolDefinition["name"];
  requiredCapability: CareerToolDefinition["requiredCapability"];
  riskLevel: CareerToolDefinition["riskLevel"];
  requiresExplicitApproval: boolean;
  executionMode: CareerToolDefinition["executionMode"];
  allowed: boolean;
} {
  return {
    toolName: definition.name,
    requiredCapability: definition.requiredCapability,
    riskLevel: definition.riskLevel,
    requiresExplicitApproval: definition.requiresExplicitApproval,
    executionMode: definition.executionMode,
    allowed: definition.executionMode !== "blocked",
  };
}
