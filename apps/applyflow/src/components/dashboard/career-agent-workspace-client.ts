import type { CareerAgentOrchestrationBody, CareerAgentResult } from "@devflow/career-core";

export const CAREER_AGENT_ORCHESTRATION_URL = "/career-agents/orchestrate";

export type CareerAgentWorkspaceUiState =
  | "idle"
  | "validating"
  | "blocked"
  | "ready"
  | "running"
  | "completed"
  | "error";

export async function runCareerAgentOrchestration(
  body: CareerAgentOrchestrationBody,
  fetchImpl: typeof fetch = fetch,
): Promise<CareerAgentResult> {
  const response = await fetchImpl(CAREER_AGENT_ORCHESTRATION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return (await response.json()) as CareerAgentResult;
}
