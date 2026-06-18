import type { CareerAgentIntent, CareerAgentKind } from "./types.js";

export const CAREER_AGENT_INTENT_ROUTING: Record<CareerAgentIntent, Exclude<CareerAgentKind, "career_orchestrator">> = {
  analyze_application_fit: "application_analyst",
  analyze_profile_gaps: "profile_gap_analyst",
  prepare_interview: "interview_coach",
  analyze_resume: "resume_analyst",
  analyze_ats_compatibility: "ats_analyst",
  plan_career_strategy: "career_strategy_advisor",
};

export function resolveCareerAgentForIntent(intent: CareerAgentIntent): Exclude<CareerAgentKind, "career_orchestrator"> | null {
  return CAREER_AGENT_INTENT_ROUTING[intent] ?? null;
}

export function isCareerAgentCompatibleWithIntent(
  intent: CareerAgentIntent,
  agent: CareerAgentKind,
): boolean {
  if (agent === "career_orchestrator") {
    return false;
  }

  return resolveCareerAgentForIntent(intent) === agent;
}
