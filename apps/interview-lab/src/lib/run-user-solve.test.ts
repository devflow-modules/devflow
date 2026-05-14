import { describe, expect, it } from "vitest";
import { getProblemById } from "@/data/problems";
import { extractSolveFromUserCode, runProblemTests } from "@/lib/run-user-solve";

describe("extractSolveFromUserCode", () => {
  it("returns solve from user code", () => {
    const solve = extractSolveFromUserCode(`
      function solve(x) { return x * 2; }
    `);
    expect(solve(21)).toBe(42);
  });

  it("throws when solve is missing", () => {
    expect(() => extractSolveFromUserCode(`const x = 1;`)).toThrow(/solve/);
  });
});

describe("runProblemTests", () => {
  it("runs first-unique-character against reference implementation", async () => {
    const problem = getProblemById("first-unique-character");
    expect(problem).toBeDefined();
    const code = `
      function solve(s) {
        const m = new Map();
        for (const ch of s) m.set(ch, (m.get(ch) ?? 0) + 1);
        for (let i = 0; i < s.length; i++) {
          if (m.get(s[i]) === 1) return i;
        }
        return -1;
      }
    `;
    const outcomes = await runProblemTests(code, problem!);
    expect(outcomes.every((o) => o.pass)).toBe(true);
  });

  it("surfaces thrown errors as failed test rows", async () => {
    const problem = getProblemById("valid-palindrome");
    expect(problem).toBeDefined();
    const outcomes = await runProblemTests(`function solve() { throw new Error("boom"); }`, problem!);
    expect(outcomes.some((o) => !o.pass)).toBe(true);
  });
});
