import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CAREER_TOOLS_ROOT = join(process.cwd(), "src/career-tools");

const FORBIDDEN_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "fetch", pattern: /\bfetch\s*\(/ },
  { label: "XMLHttpRequest", pattern: /XMLHttpRequest/ },
  { label: "WebSocket", pattern: /WebSocket/ },
  { label: "localStorage", pattern: /localStorage/ },
  { label: "sessionStorage", pattern: /sessionStorage/ },
  { label: "IndexedDB", pattern: /IndexedDB/ },
  { label: "fs", pattern: /\bfrom\s+["']fs["']|\bfrom\s+["']node:fs["']|\brequire\(["']fs["']\)/ },
  { label: "child_process", pattern: /\bfrom\s+["']child_process["']|\bfrom\s+["']node:child_process["']/ },
  { label: "Nango", pattern: /Nango/ },
  { label: "OpenAI", pattern: /OpenAI/ },
  { label: "LibreChat", pattern: /LibreChat/ },
  { label: "MCP SDK", pattern: /@modelcontextprotocol/ },
];

function collectSourceFiles(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") {
        continue;
      }
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("career-tools dependency boundary", () => {
  const sourceFiles = collectSourceFiles(CAREER_TOOLS_ROOT);

  it("includes production source files", () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  for (const filePath of sourceFiles) {
    it(`${filePath.replace(`${CAREER_TOOLS_ROOT}/`, "")} avoids forbidden runtime dependencies`, () => {
      const source = readFileSync(filePath, "utf8");

      for (const forbidden of FORBIDDEN_PATTERNS) {
        expect(source, forbidden.label).not.toMatch(forbidden.pattern);
      }
    });
  }
});
