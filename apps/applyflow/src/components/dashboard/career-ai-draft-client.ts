import type { CareerLlmGenerateBody, CareerLlmResult } from "@devflow/career-core";

export const CAREER_LLM_GENERATE_URL = "/career-llm/generate";

export type CareerAiDraftUiState =
  | "idle"
  | "loading"
  | "blocked"
  | "completed"
  | "error";

export async function runCareerLlmGenerate(
  body: CareerLlmGenerateBody,
  fetchImpl: typeof fetch = fetch,
): Promise<CareerLlmResult> {
  const response = await fetchImpl(CAREER_LLM_GENERATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return (await response.json()) as CareerLlmResult;
}
