import { describe, expect, it } from "vitest";

const FORBIDDEN_PATTERNS = [
  /child_process|node:child_process/,
  /node:fs|\bfrom\s+["']fs["']/,
  /\bexec\s*\(/,
  /\bspawn\s*\(/,
  /WebSocket/,
  /XMLHttpRequest/,
  /OpenAI/,
  /Nango/,
  /LibreChat/,
  /@modelcontextprotocol/,
  /localStorage/,
  /sessionStorage/,
  /IndexedDB/,
];

describe("applyflow career tool boundary sources", () => {
  it("keeps fetch only in client boundary module", async () => {
    const boundarySource = String((await import("./career-tool-invoke-boundary.ts?raw")).default);
    expect(boundarySource).not.toMatch(/\bfetch\s*\(/);
  });

  it("allows fetch in permission review client only", async () => {
    const clientSource = String(
      (await import("../../components/dashboard/career-tool-permission-review-client.ts?raw")).default,
    );
    expect(clientSource).toMatch(/fetchImpl|fetch\s*\(/);
  });

  for (const relativePath of [
    "./career-tool-invoke-boundary.ts",
    "../../components/dashboard/career-tool-permission-review.tsx",
    "../../components/dashboard/career-tool-permission-review-content.ts",
  ] as const) {
    it(`${relativePath} avoids forbidden runtime dependencies`, async () => {
      const source = String((await import(`${relativePath}?raw`)).default);

      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(source).not.toMatch(pattern);
      }
    });
  }
});
