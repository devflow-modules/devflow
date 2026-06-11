export {
  atsMatchOutputSchema,
  explainGapSeverityInputSchema,
  jobAnalysisInputSchema,
  matchResumeToJobInputSchema,
  resumeAnalysisInputSchema,
} from "./schemas.js";
export type {
  ExplainGapSeverityInputParsed,
  JobAnalysisInputParsed,
  MatchResumeToJobInputParsed,
  ResumeAnalysisInputParsed,
} from "./schemas.js";

export { handleAnalyzeJob, TOOL_NAME as ANALYZE_JOB_TOOL } from "./tools/analyze-job.js";
export { handleAnalyzeResume, TOOL_NAME as ANALYZE_RESUME_TOOL } from "./tools/analyze-resume.js";
export {
  handleMatchResumeToJob,
  TOOL_NAME as MATCH_RESUME_TO_JOB_TOOL,
  type MatchResumeToJobOutput,
} from "./tools/match-resume-to-job.js";
export {
  handleExplainGapSeverity,
  TOOL_NAME as EXPLAIN_GAP_SEVERITY_TOOL,
  type ExplainGapSeverityOutput,
} from "./tools/explain-gap-severity.js";

export {
  CAREER_AGENTS_MCP_TOOLS,
  getCareerAgentsMcpTool,
  invokeCareerAgentsMcpTool,
  type CareerAgentsMcpToolDefinition,
} from "./server.js";

export {
  CAREER_AGENTS_MCP_SERVER_INFO,
  createCareerAgentsMcpServer,
  formatToolError,
  formatToolHandlerError,
  formatToolResult,
  getCareerAgentsToolTransportDefinitions,
  registerCareerAgentsTools,
  type McpToolTextResult,
} from "./transport/register-tools.js";
export { startCareerAgentsStdioTransport } from "./transport/stdio.js";
