import { describe, expect, it } from "vitest";

import { sampleFullstackSaasJob, sampleJuniorResume } from "@devflow/career-agents";

import {
  createCareerAgentsMcpServer,
  formatToolError,
  formatToolHandlerError,
  formatToolResult,
  invokeCareerAgentsMcpTool,
  registerCareerAgentsTools,
  startCareerAgentsStdioTransport,
} from "../src/index.js";
import { ZodError } from "zod";

describe("MCP transport registration", () => {
  it("registers four tools on McpServer without throwing", () => {
    const server = createCareerAgentsMcpServer();
    const names = registerCareerAgentsTools(server);
    expect(names).toEqual([
      "analyze_job",
      "analyze_resume",
      "match_resume_to_job",
      "explain_gap_severity",
    ]);
  });

  it("formats deterministic JSON tool results", () => {
    const formatted = formatToolResult({ score: 42 });
    expect(formatted.content[0]?.type).toBe("text");
    expect(formatted.content[0]?.text).toContain('"score": 42');
    expect(formatted.isError).toBeUndefined();
  });

  it("formats validation errors clearly", () => {
    const message = formatToolHandlerError(
      new ZodError([{ code: "too_small", minimum: 1, type: "string", inclusive: true, message: "Required", path: ["title"] }]),
    );
    expect(message).toMatch(/Invalid tool input/);
    expect(formatToolError(message).isError).toBe(true);
  });

  it("imports stdio module without auto-starting transport", () => {
    expect(typeof startCareerAgentsStdioTransport).toBe("function");
  });

  it("keeps valid tool inputs working through registry handlers", () => {
    const server = createCareerAgentsMcpServer();
    registerCareerAgentsTools(server);
    const matchInput = { job: sampleFullstackSaasJob, resume: sampleJuniorResume };
    const result = invokeCareerAgentsMcpTool("match_resume_to_job", matchInput) as { match: { score: number } };
    expect(result.match.score).toBeGreaterThanOrEqual(0);
  });
});
