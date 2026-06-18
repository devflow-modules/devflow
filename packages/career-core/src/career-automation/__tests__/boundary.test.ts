import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CAREER_AUTOMATION_ROOT = join(process.cwd(), "src/career-automation");

/**
 * The automation core is allowed to REUSE the pure career tool engine
 * (invokeCareerTool) after policy and approval. It must never reach for network,
 * storage, streaming, scheduling, background execution, or external SDKs.
 */
const FORBIDDEN_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "OpenAI", pattern: /OpenAI/ },
  { label: "Anthropic", pattern: /Anthropic/ },
  { label: "LibreChat", pattern: /LibreChat/ },
  { label: "OpenClaw SDK", pattern: /OpenClaw/ },
  { label: "MCP SDK", pattern: /@modelcontextprotocol/ },
  { label: "Nango", pattern: /Nango/ },
  { label: "fetch", pattern: /\bfetch\s*\(/ },
  { label: "WebSocket", pattern: /WebSocket/ },
  { label: "SSE", pattern: /EventSource/ },
  { label: "ReadableStream", pattern: /ReadableStream/ },
  { label: "localStorage", pattern: /localStorage/ },
  { label: "sessionStorage", pattern: /sessionStorage/ },
  { label: "IndexedDB", pattern: /IndexedDB/ },
  // Note: scheduling/background terms (cron, scheduler, queue, worker) appear by
  // design in the security scanner and schema docs because the boundary REJECTS
  // them. We instead ban the concrete runtime primitives that could implement them.
  { label: "setInterval", pattern: /setInterval/ },
  { label: "setTimeout", pattern: /setTimeout/ },
  { label: "node:timers", pattern: /\bfrom\s+["']timers["']|\bfrom\s+["']node:timers["']/ },
  { label: "fs", pattern: /\bfrom\s+["']fs["']|\bfrom\s+["']node:fs["']/ },
  { label: "child_process", pattern: /\bfrom\s+["']child_process["']|\bfrom\s+["']node:child_process["']/ },
];

function collectSourceFiles(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("career-automation dependency boundary", () => {
  const sourceFiles = collectSourceFiles(CAREER_AUTOMATION_ROOT);

  for (const filePath of sourceFiles) {
    it(`${filePath.replace(`${CAREER_AUTOMATION_ROOT}/`, "")} avoids forbidden runtime dependencies`, () => {
      const source = readFileSync(filePath, "utf8");
      for (const forbidden of FORBIDDEN_PATTERNS) {
        expect(source, forbidden.label).not.toMatch(forbidden.pattern);
      }
    });
  }
});
