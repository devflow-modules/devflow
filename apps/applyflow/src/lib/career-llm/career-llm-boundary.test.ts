import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOTS = [
  join(process.cwd(), "src/lib/career-llm"),
  join(process.cwd(), "src/components/dashboard"),
];

// The OpenAI provider legitimately uses server-side fetch and is excluded from the
// fetch ban; it is still scanned for storage/stream/tool-execution dependencies below.
const FORBIDDEN_PATTERNS: Array<{ label: string; pattern: RegExp; appliesTo?: (file: string) => boolean }> = [
  { label: "Anthropic", pattern: /Anthropic/ },
  { label: "MCP SDK", pattern: /@modelcontextprotocol/ },
  { label: "Nango", pattern: /Nango/ },
  { label: "WebSocket", pattern: /WebSocket/ },
  { label: "SSE", pattern: /EventSource/ },
  { label: "ReadableStream", pattern: /ReadableStream/ },
  { label: "localStorage", pattern: /localStorage/ },
  { label: "sessionStorage", pattern: /sessionStorage/ },
  { label: "IndexedDB", pattern: /IndexedDB/ },
  { label: "career tool executor", pattern: /executeCareerTool|career-tools\/invoke/ },
  {
    label: "fetch",
    pattern: /\bfetch\s*\(/,
    appliesTo: (file) => !file.endsWith("openai-provider.ts"),
  },
];

const TARGET_FILES = [
  join(ROOTS[0], "career-llm-boundary.ts"),
  join(ROOTS[0], "openai-provider.ts"),
  join(ROOTS[1], "career-ai-draft.tsx"),
  join(ROOTS[1], "career-ai-draft-client.ts"),
  join(ROOTS[1], "career-ai-draft-content.ts"),
];

describe("applyflow career-llm boundary", () => {
  for (const filePath of TARGET_FILES) {
    it(`${filePath.replace(`${process.cwd()}/`, "")} avoids forbidden runtime dependencies`, () => {
      const source = readFileSync(filePath, "utf8");
      for (const forbidden of FORBIDDEN_PATTERNS) {
        if (forbidden.appliesTo && !forbidden.appliesTo(filePath)) {
          continue;
        }
        expect(source, forbidden.label).not.toMatch(forbidden.pattern);
      }
    });
  }

  it("client fetch stays on the career-llm endpoint only", () => {
    const source = readFileSync(join(ROOTS[1], "career-ai-draft-client.ts"), "utf8");
    expect(source).toMatch(/\/career-llm\/generate/);
    expect(source).not.toMatch(/\/career-tools\/invoke|\/career-agents\/orchestrate|\/career-chat\/librechat/);
  });
});
