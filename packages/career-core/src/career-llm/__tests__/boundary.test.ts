import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CAREER_LLM_ROOT = join(process.cwd(), "src/career-llm");

const FORBIDDEN_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "OpenAI", pattern: /OpenAI/ },
  { label: "Anthropic", pattern: /Anthropic/ },
  { label: "MCP SDK", pattern: /@modelcontextprotocol/ },
  { label: "Nango", pattern: /Nango/ },
  { label: "fetch", pattern: /\bfetch\s*\(/ },
  { label: "WebSocket", pattern: /WebSocket/ },
  { label: "SSE", pattern: /EventSource/ },
  { label: "ReadableStream", pattern: /ReadableStream/ },
  { label: "localStorage", pattern: /localStorage/ },
  { label: "sessionStorage", pattern: /sessionStorage/ },
  { label: "IndexedDB", pattern: /IndexedDB/ },
  { label: "fs", pattern: /\bfrom\s+["']fs["']|\bfrom\s+["']node:fs["']/ },
  { label: "child_process", pattern: /\bfrom\s+["']child_process["']|\bfrom\s+["']node:child_process["']/ },
  { label: "career tool executor", pattern: /executeCareerTool|career-tools\/invoke/ },
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

describe("career-llm dependency boundary", () => {
  const sourceFiles = collectSourceFiles(CAREER_LLM_ROOT);

  for (const filePath of sourceFiles) {
    it(`${filePath.replace(`${CAREER_LLM_ROOT}/`, "")} avoids forbidden runtime dependencies`, () => {
      const source = readFileSync(filePath, "utf8");
      for (const forbidden of FORBIDDEN_PATTERNS) {
        expect(source, forbidden.label).not.toMatch(forbidden.pattern);
      }
    });
  }
});
