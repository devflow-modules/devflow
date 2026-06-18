import type { CareerAutomationExecuteBody, CareerAutomationExecutionResult } from "@devflow/career-core";

export const CAREER_AUTOMATION_EXECUTE_URL = "/career-automation/execute";

export type ApprovedAutomationUiState =
  | "idle"
  | "approval_required"
  | "running"
  | "completed"
  | "blocked"
  | "cancelled";

export async function runCareerAutomationExecute(
  body: CareerAutomationExecuteBody,
  fetchImpl: typeof fetch = fetch,
): Promise<CareerAutomationExecutionResult> {
  const response = await fetchImpl(CAREER_AUTOMATION_EXECUTE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return (await response.json()) as CareerAutomationExecutionResult;
}
