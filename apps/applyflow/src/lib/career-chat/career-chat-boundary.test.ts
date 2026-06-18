import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOTS = [
  join(process.cwd(), "src/lib/career-chat"),
  join(process.cwd(), "src/components/dashboard"),
];

const TARGET_FILES = [
  "career-chat-librechat-boundary.ts",
  "career-chat-workspace-client.ts",
  "career-chat-workspace.tsx",
];

const FORBIDDEN_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "OpenAI", pattern: /OpenAI/ },
  { label: "Anthropic", pattern: /Anthropic/ },
  { label: "LibreChat SDK", pattern: /LibreChat SDK/ },
  { label: "MCP SDK", pattern: /@modelcontextprotocol/ },
  { label: "Nango", pattern: /Nango/ },
  { label: "WebSocket", pattern: /WebSocket/ },
  { label: "SSE", pattern: /EventSource/ },
  { label: "ReadableStream", pattern: /ReadableStream/ },
  { label: "localStorage", pattern: /localStorage/ },
  { label: "sessionStorage", pattern: /sessionStorage/ },
  { label: "IndexedDB", pattern: /IndexedDB/ },
  { label: "fs", pattern: /\bfrom\s+["']fs["']|\bfrom\s+["']node:fs["']/ },
  { label: "child_process", pattern: /\bfrom\s+["']child_process["']|\bfrom\s+["']node:child_process["']/ },
];

function collectTargetFiles(): string[] {
  const files: string[] = [];

  for (const root of ROOTS) {
    for (const name of TARGET_FILES) {
      files.push(join(root, name));
    }
  }

  return files.filter((filePath) => {
    try {
      readFileSync(filePath);
      return true;
    } catch {
      return false;
    }
  });
}

describe("applyflow career-chat boundary", () => {
  for (const filePath of collectTargetFiles()) {
    it(`${filePath.replace(`${process.cwd()}/`, "")} avoids forbidden runtime dependencies`, () => {
      const source = readFileSync(filePath, "utf8");
      for (const forbidden of FORBIDDEN_PATTERNS) {
        expect(source, forbidden.label).not.toMatch(forbidden.pattern);
      }
    });
  }

  it("client fetch stays on career-chat endpoint only", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/dashboard/career-chat-workspace-client.ts"),
      "utf8",
    );
    expect(source).toMatch(/\/career-chat\/librechat/);
    expect(source).not.toMatch(/\/career-tools\/invoke|\/career-agents\/orchestrate/);
  });
});
