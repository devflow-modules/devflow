import {
  resolveAllowedCapabilitiesForAgent,
  resolveBlockedCapabilitiesForAgent,
} from "./capability-resolution.js";
import { isCareerAgentCompatibleWithIntent, resolveCareerAgentForIntent } from "./routing.js";
import type {
  CareerAgentContext,
  CareerAgentExecutionPlan,
  CareerAgentIntent,
  CareerAgentKind,
  CareerAgentRequest,
} from "./types.js";

function requiredInputsForIntent(intent: CareerAgentIntent): string[] {
  switch (intent) {
    case "analyze_application_fit":
      return ["careerBundle.applications"];
    case "analyze_profile_gaps":
      return ["careerBundle.applications"];
    case "prepare_interview":
      return ["careerBundle.applications"];
    default:
      return ["careerBundle"];
  }
}

function resolveMissingInputs(context: CareerAgentContext, requiredInputs: string[]): string[] {
  const missing: string[] = [];

  if (requiredInputs.includes("careerBundle.applications") && context.careerBundle.applications.length === 0) {
    missing.push("careerBundle.applications");
  }

  return missing;
}

export type CareerAgentSelection = {
  ok: true;
  agent: Exclude<CareerAgentKind, "career_orchestrator">;
  reason: string;
} | {
  ok: false;
  code: "unsupported_intent" | "unsupported_agent" | "agent_intent_mismatch";
  message: string;
};

export function selectCareerAgent(request: CareerAgentRequest): CareerAgentSelection {
  const routed = resolveCareerAgentForIntent(request.intent);

  if (!routed) {
    return {
      ok: false,
      code: "unsupported_intent",
      message: "Intent is not supported by deterministic routing.",
    };
  }

  if (request.requestedAgent && request.requestedAgent === "career_orchestrator") {
    return {
      ok: false,
      code: "unsupported_agent",
      message: "Career orchestrator does not execute advisory analysis directly.",
    };
  }

  if (request.requestedAgent && !isCareerAgentCompatibleWithIntent(request.intent, request.requestedAgent)) {
    return {
      ok: false,
      code: "agent_intent_mismatch",
      message: "Requested agent is incompatible with the selected intent.",
    };
  }

  const agent = request.requestedAgent ?? routed;
  const reason = request.requestedAgent
    ? `Requested agent ${request.requestedAgent} matches intent ${request.intent}.`
    : `Intent ${request.intent} routed to ${routed}.`;

  return { ok: true, agent, reason };
}

export function buildCareerAgentExecutionPlan(input: {
  agent: Exclude<CareerAgentKind, "career_orchestrator">;
  reason: string;
  intent: CareerAgentIntent;
  context: CareerAgentContext;
}): CareerAgentExecutionPlan {
  const requiredInputs = requiredInputsForIntent(input.intent);
  const missingInputs = resolveMissingInputs(input.context, requiredInputs);

  return {
    selectedAgent: input.agent,
    reason: input.reason,
    requiredInputs,
    missingInputs,
    allowedCapabilities: resolveAllowedCapabilitiesForAgent(input.agent),
    blockedCapabilities: resolveBlockedCapabilitiesForAgent(input.agent),
    reviewRequired: true,
  };
}
