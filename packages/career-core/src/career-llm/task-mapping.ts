import type { CareerAgentIntent, CareerAgentKind } from "../career-agents/types.js";
import type { CareerLlmTask } from "./types.js";

/**
 * Deterministic, server-authoritative mapping from a completed agent to its LLM task.
 * The client never selects the task; it is derived from the orchestrator's selected agent.
 */
export const CAREER_LLM_TASK_BY_AGENT: Record<
  Exclude<CareerAgentKind, "career_orchestrator">,
  CareerLlmTask
> = {
  application_analyst: "generate_application_fit_explanation",
  profile_gap_analyst: "generate_profile_gap_explanation",
  interview_coach: "generate_interview_preparation_content",
};

export const CAREER_LLM_TASK_BY_INTENT: Record<CareerAgentIntent, CareerLlmTask> = {
  analyze_application_fit: "generate_application_fit_explanation",
  analyze_profile_gaps: "generate_profile_gap_explanation",
  prepare_interview: "generate_interview_preparation_content",
};

export type ResolveCareerLlmTaskResult =
  | { ok: true; task: CareerLlmTask }
  | { ok: false; code: "unsupported_llm_task" | "agent_task_mismatch"; message: string };

export function resolveCareerLlmTask(
  agent: CareerAgentKind,
  intent: CareerAgentIntent,
): ResolveCareerLlmTaskResult {
  if (agent === "career_orchestrator") {
    return {
      ok: false,
      code: "unsupported_llm_task",
      message: "Orchestrator agent cannot resolve an LLM task.",
    };
  }

  const taskFromAgent = CAREER_LLM_TASK_BY_AGENT[agent];
  if (!taskFromAgent) {
    return {
      ok: false,
      code: "unsupported_llm_task",
      message: `No LLM task is mapped for agent ${agent}.`,
    };
  }

  const taskFromIntent = CAREER_LLM_TASK_BY_INTENT[intent];
  if (taskFromIntent !== taskFromAgent) {
    return {
      ok: false,
      code: "agent_task_mismatch",
      message: `Agent ${agent} is not compatible with intent ${intent}.`,
    };
  }

  return { ok: true, task: taskFromAgent };
}
