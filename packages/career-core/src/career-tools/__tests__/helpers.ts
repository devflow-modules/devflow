import { buildCareerAgentExecutionPlan } from "../../career-agents/execution-plan.js";
import { buildCareerAgentContext } from "../../career-agents/context.js";
import { buildCareerAgentRequest } from "../../career-agents/request.js";
import type { CareerAgentExecutionPlan } from "../../career-agents/types.js";
import { createSampleOrchestrationBody } from "../../career-agents/__tests__/fixtures.js";

export function createExecutionPlanFromOrchestration(
  overrides: Parameters<typeof createSampleOrchestrationBody>[0] = {},
): { orchestration: ReturnType<typeof createSampleOrchestrationBody>; executionPlan: CareerAgentExecutionPlan } {
  const orchestration = createSampleOrchestrationBody(overrides);
  const request = buildCareerAgentRequest(orchestration);
  const context = buildCareerAgentContext(request);
  const executionPlan = buildCareerAgentExecutionPlan({
    agent: "application_analyst",
    reason: "test",
    intent: request.intent,
    context,
  });

  return { orchestration, executionPlan };
}

export function createRestrictedExecutionPlan(
  allowedCapabilities: CareerAgentExecutionPlan["allowedCapabilities"],
  selectedAgent: CareerAgentExecutionPlan["selectedAgent"] = "application_analyst",
): CareerAgentExecutionPlan {
  return {
    selectedAgent,
    reason: "restricted-test-plan",
    requiredInputs: ["careerBundle.applications"],
    missingInputs: [],
    allowedCapabilities,
    blockedCapabilities: ["submit_application"],
    reviewRequired: true,
  };
}
