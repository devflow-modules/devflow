import { analyzeResume, type ResumeAnalysisOutput } from "@devflow/career-agents";

import { resumeAnalysisInputSchema, type ResumeAnalysisInputParsed } from "../schemas.js";

export const TOOL_NAME = "analyze_resume" as const;

export function handleAnalyzeResume(input: ResumeAnalysisInputParsed): ResumeAnalysisOutput {
  const parsed = resumeAnalysisInputSchema.parse(input);
  return analyzeResume(parsed);
}
