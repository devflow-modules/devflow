import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pathToFileURL } from "node:url";

import {
  createCareerAgentsMcpServer,
  registerCareerAgentsTools,
} from "./register-tools.js";

/**
 * Starts the Career Agents MCP server on stdio (local lab only).
 * Does not open network ports or persist data.
 */
export async function startCareerAgentsStdioTransport(): Promise<void> {
  const server = createCareerAgentsMcpServer();
  registerCareerAgentsTools(server);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function isStdioEntrypoint(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (isStdioEntrypoint()) {
  startCareerAgentsStdioTransport().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`career-agents-mcp stdio error: ${message}\n`);
    process.exit(1);
  });
}
