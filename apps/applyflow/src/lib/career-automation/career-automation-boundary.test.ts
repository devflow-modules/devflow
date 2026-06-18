import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const LIB_ROOT = join(process.cwd(), "src/lib/career-automation");
const DASHBOARD_ROOT = join(process.cwd(), "src/components/dashboard");

/**
 * The automation boundary may reuse the pure career tool engine server-side
 * (invokeCareerTool) but must never schedule, queue, stream, persist, or open
 * arbitrary network. The OpenClaw adapter is server-side only and is named here on
 * purpose, so the "OpenClaw" string itself is not banned. The OpenClaw adapter
 * legitimately uses server-side fetch to reach the controlled transport, so it is
 * excluded from the fetch ban; it is still scanned for storage/stream/scheduler deps.
 */
const FORBIDDEN_PATTERNS: Array<{ label: string; pattern: RegExp; appliesTo?: (file: string) => boolean }> = [
  { label: "Anthropic", pattern: /Anthropic/ },
  { label: "OpenAI", pattern: /OpenAI/ },
  { label: "LibreChat", pattern: /LibreChat/ },
  { label: "MCP SDK", pattern: /@modelcontextprotocol/ },
  { label: "Nango", pattern: /Nango/ },
  { label: "fetch", pattern: /\bfetch\s*\(/, appliesTo: (file) => !file.endsWith("openclaw-provider.ts") },
  { label: "WebSocket", pattern: /WebSocket/ },
  { label: "SSE", pattern: /EventSource/ },
  { label: "ReadableStream", pattern: /ReadableStream/ },
  { label: "localStorage", pattern: /localStorage/ },
  { label: "sessionStorage", pattern: /sessionStorage/ },
  { label: "IndexedDB", pattern: /IndexedDB/ },
  { label: "setInterval", pattern: /setInterval/ },
  { label: "cron import", pattern: /\bfrom\s+["'][^"']*cron[^"']*["']/ },
  { label: "bull/queue", pattern: /\bfrom\s+["'](bull|bullmq|bee-queue|agenda)["']/ },
];

const TARGET_FILES = [
  join(LIB_ROOT, "career-automation-boundary.ts"),
  join(LIB_ROOT, "openclaw-provider.ts"),
  join(DASHBOARD_ROOT, "approved-automation-review.tsx"),
  join(DASHBOARD_ROOT, "approved-automation-review-client.ts"),
  join(DASHBOARD_ROOT, "approved-automation-review-content.ts"),
];

describe("applyflow career-automation boundary", () => {
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

  it("client fetch stays on the career-automation endpoint only", () => {
    const source = readFileSync(join(DASHBOARD_ROOT, "approved-automation-review-client.ts"), "utf8");
    expect(source).toMatch(/\/career-automation\/execute/);
    expect(source).not.toMatch(/\/career-tools\/invoke|\/career-agents\/orchestrate|\/career-llm\/generate/);
  });
});
