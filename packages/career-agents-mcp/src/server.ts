import type { z } from "zod";

import {
  explainGapSeverityInputSchema,
  jobAnalysisInputSchema,
  matchResumeToJobInputSchema,
  resumeAnalysisInputSchema,
} from "./schemas.js";
import { handleAnalyzeJob, TOOL_NAME as ANALYZE_JOB } from "./tools/analyze-job.js";
import { handleAnalyzeResume, TOOL_NAME as ANALYZE_RESUME } from "./tools/analyze-resume.js";
import {
  handleExplainGapSeverity,
  TOOL_NAME as EXPLAIN_GAP_SEVERITY,
} from "./tools/explain-gap-severity.js";
import {
  handleMatchResumeToJob,
  TOOL_NAME as MATCH_RESUME_TO_JOB,
} from "./tools/match-resume-to-job.js";

export type CareerAgentsMcpToolDefinition = {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  /** Pure deterministic handler — no network, no persistence. */
  handler: (input: unknown) => unknown;
};

/**
 * Tool registry for local lab use. MCP stdio/HTTP transport lands in a follow-up PR.
 */
export const CAREER_AGENTS_MCP_TOOLS: readonly CareerAgentsMcpToolDefinition[] = [
  {
    name: ANALYZE_JOB,
    description: "Analyze a job description (seniority, skills, risk/domain signals).",
    inputSchema: jobAnalysisInputSchema,
    handler: (input) => handleAnalyzeJob(jobAnalysisInputSchema.parse(input)),
  },
  {
    name: ANALYZE_RESUME,
    description: "Analyze a structured resume (skills, evidence levels, portfolio hints).",
    inputSchema: resumeAnalysisInputSchema,
    handler: (input) => handleAnalyzeResume(resumeAnalysisInputSchema.parse(input)),
  },
  {
    name: MATCH_RESUME_TO_JOB,
    description: "Run full deterministic job + resume analysis and ATS-style match.",
    inputSchema: matchResumeToJobInputSchema,
    handler: (input) => handleMatchResumeToJob(matchResumeToJobInputSchema.parse(input)),
  },
  {
    name: EXPLAIN_GAP_SEVERITY,
    description: "Transform match gapSeverity into deterministic summary text (no LLM).",
    inputSchema: explainGapSeverityInputSchema,
    handler: (input) => handleExplainGapSeverity(explainGapSeverityInputSchema.parse(input)),
  },
] as const;

export function getCareerAgentsMcpTool(name: string): CareerAgentsMcpToolDefinition | undefined {
  return CAREER_AGENTS_MCP_TOOLS.find((t) => t.name === name);
}

export function invokeCareerAgentsMcpTool(name: string, input: unknown): unknown {
  const tool = getCareerAgentsMcpTool(name);
  if (!tool) {
    throw new Error(`Unknown Career Agents MCP tool: ${name}`);
  }
  return tool.handler(input);
}
