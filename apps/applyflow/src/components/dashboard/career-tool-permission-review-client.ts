import type { CareerToolExecutionResult, CareerToolInvokeBodyParsed } from "@devflow/career-core";

export const CAREER_TOOL_INVOKE_URL = "/career-tools/invoke";

export async function runCareerToolInvoke(
  body: CareerToolInvokeBodyParsed,
  fetchImpl: typeof fetch = fetch,
): Promise<CareerToolExecutionResult> {
  const response = await fetchImpl(CAREER_TOOL_INVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return (await response.json()) as CareerToolExecutionResult;
}
