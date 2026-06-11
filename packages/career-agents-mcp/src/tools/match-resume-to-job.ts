import {
  analyzeJob,
  analyzeResume,
  matchJobToResume,
  type AtsMatchOutput,
  type JobAnalysisOutput,
  type ResumeAnalysisOutput,
} from "@devflow/career-agents";

import { matchResumeToJobInputSchema, type MatchResumeToJobInputParsed } from "../schemas.js";

export const TOOL_NAME = "match_resume_to_job" as const;

export type MatchResumeToJobOutput = {
  jobAnalysis: JobAnalysisOutput;
  resumeAnalysis: ResumeAnalysisOutput;
  match: AtsMatchOutput;
};

export function handleMatchResumeToJob(input: MatchResumeToJobInputParsed): MatchResumeToJobOutput {
  const parsed = matchResumeToJobInputSchema.parse(input);
  const jobAnalysis = analyzeJob(parsed.job);
  const resumeAnalysis = analyzeResume(parsed.resume);
  const match = matchJobToResume(jobAnalysis, resumeAnalysis);
  return { jobAnalysis, resumeAnalysis, match };
}
