import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ZodError } from "zod";

import { CAREER_AGENTS_MCP_TOOLS, invokeCareerAgentsMcpTool } from "../server.js";

export const CAREER_AGENTS_MCP_SERVER_INFO = {
  name: "@devflow/career-agents-mcp",
  version: "0.0.1",
} as const;

export type McpToolTextResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export function formatToolResult(result: unknown): McpToolTextResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

export function formatToolError(message: string): McpToolTextResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

export function formatToolHandlerError(error: unknown): string {
  if (error instanceof ZodError) {
    const details = error.errors.map((e) => `${e.path.join(".") || "input"}: ${e.message}`).join("; ");
    return `Invalid tool input: ${details}`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Expose Zod input schemas for transport registration and tests. */
export function getCareerAgentsToolTransportDefinitions() {
  return CAREER_AGENTS_MCP_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
}

/**
 * Registers deterministic Career Agents tools on an MCP server instance.
 * Reuses {@link invokeCareerAgentsMcpTool} — no duplicated analysis logic.
 */
export function registerCareerAgentsTools(server: McpServer): readonly string[] {
  const registered: string[] = [];

  for (const tool of CAREER_AGENTS_MCP_TOOLS) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (args) => {
        try {
          const result = invokeCareerAgentsMcpTool(tool.name, args);
          return formatToolResult(result);
        } catch (error) {
          return formatToolError(formatToolHandlerError(error));
        }
      },
    );
    registered.push(tool.name);
  }

  return registered;
}

export function createCareerAgentsMcpServer(): McpServer {
  return new McpServer(CAREER_AGENTS_MCP_SERVER_INFO);
}
