import { analyzeJob, type JobAnalysisOutput } from "@devflow/career-agents";

import { jobAnalysisInputSchema, type JobAnalysisInputParsed } from "../schemas.js";

export const TOOL_NAME = "analyze_job" as const;

export function handleAnalyzeJob(input: JobAnalysisInputParsed): JobAnalysisOutput {
  const parsed = jobAnalysisInputSchema.parse(input);
  return analyzeJob(parsed);
}
