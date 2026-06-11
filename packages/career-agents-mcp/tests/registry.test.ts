import { describe, expect, it } from "vitest";

import { sampleJobInput } from "@devflow/career-agents";

import {
  CAREER_AGENTS_MCP_TOOLS,
  getCareerAgentsToolTransportDefinitions,
  invokeCareerAgentsMcpTool,
  jobAnalysisInputSchema,
} from "../src/index.js";

describe("tool registry", () => {
  it("contains four deterministic tools", () => {
    expect(CAREER_AGENTS_MCP_TOOLS).toHaveLength(4);
    expect(CAREER_AGENTS_MCP_TOOLS.map((t) => t.name)).toEqual([
      "analyze_job",
      "analyze_resume",
      "match_resume_to_job",
      "explain_gap_severity",
    ]);
  });

  it("exposes input schemas for transport registration", () => {
    const defs = getCareerAgentsToolTransportDefinitions();
    expect(defs).toHaveLength(4);
    for (const def of defs) {
      expect(def.description.length).toBeGreaterThan(0);
      expect(def.inputSchema.safeParse).toBeTypeOf("function");
    }
    expect(jobAnalysisInputSchema.safeParse(sampleJobInput).success).toBe(true);
  });

  it("returns controlled error for unknown tool", () => {
    expect(() => invokeCareerAgentsMcpTool("unknown_tool", {})).toThrow(/Unknown Career Agents MCP tool/);
  });

  it("validates analyze_job input via schema", () => {
    expect(jobAnalysisInputSchema.safeParse({ title: "" }).success).toBe(false);
    expect(
      invokeCareerAgentsMcpTool("analyze_job", { title: "Dev", description: "React" }),
    ).toBeDefined();
  });
});
