import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const helperPath = path.resolve(
  __dirname,
  "../../../scripts/ci/assert-vitest-json-passed.cjs",
);
const { evaluateReport } = require(helperPath) as {
  evaluateReport: (
    report: unknown,
    options: { minPassed: number; strict?: boolean },
  ) => { ok: true; summary: string } | { ok: false; code: number; message: string };
};

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function baseReport(overrides: Record<string, unknown> = {}) {
  return {
    numPassedTests: 17,
    numFailedTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    numTotalTests: 17,
    success: true,
    ...overrides,
  };
}

function writeReport(report: unknown) {
  const dir = mkdtempSync(path.join(tmpdir(), "af-vitest-gate-"));
  tempDirs.push(dir);
  const file = path.join(dir, "report.json");
  writeFileSync(file, JSON.stringify(report), "utf8");
  return file;
}

function runCli(args: string[]) {
  return spawnSync(process.execPath, [helperPath, ...args], {
    encoding: "utf8",
  });
}

describe("assert-vitest-json-passed evaluateReport", () => {
  it("passes for 17/17 with zero incomplete", () => {
    const result = evaluateReport(baseReport(), { minPassed: 17 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.summary).toContain("passed=17");
  });

  it("passes for 3/3 with zero incomplete", () => {
    const result = evaluateReport(
      baseReport({
        numPassedTests: 3,
        numTotalTests: 3,
      }),
      { minPassed: 3 },
    );
    expect(result.ok).toBe(true);
  });

  it("fails when passed is below minimum", () => {
    const result = evaluateReport(
      baseReport({ numPassedTests: 16, numTotalTests: 16 }),
      { minPassed: 17 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/below threshold/);
  });

  it("fails when any test failed", () => {
    const result = evaluateReport(
      baseReport({
        numPassedTests: 16,
        numFailedTests: 1,
        numTotalTests: 17,
        success: false,
      }),
      { minPassed: 17 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/success=false|failing tests/);
  });

  it("fails in strict mode when a test is pending/skipped", () => {
    const result = evaluateReport(
      baseReport({
        numPassedTests: 16,
        numPendingTests: 1,
        numTotalTests: 17,
      }),
      { minPassed: 17, strict: true },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/incomplete/);
  });

  it("fails in strict mode when a todo remains", () => {
    const result = evaluateReport(
      baseReport({
        numPassedTests: 16,
        numTodoTests: 1,
        numTotalTests: 17,
      }),
      { minPassed: 17 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/incomplete/);
  });

  it("fails when total is inconsistent", () => {
    const result = evaluateReport(
      baseReport({ numTotalTests: 20 }),
      { minPassed: 17 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/inconsistent/);
  });

  it("fails on negative counts", () => {
    const result = evaluateReport(
      baseReport({ numFailedTests: -1, numTotalTests: 16 }),
      { minPassed: 17 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/negative/);
  });

  it("fails on decimal counts", () => {
    const result = evaluateReport(
      baseReport({ numPassedTests: 17.5, numTotalTests: 17.5 }),
      { minPassed: 17 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/integer/);
  });

  it("fails when a required field is missing", () => {
    const { numTodoTests: _omit, ...rest } = baseReport();
    void _omit;
    const result = evaluateReport(rest, { minPassed: 17 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/missing required field/);
  });

  it("fails on empty object / non-object report", () => {
    expect(evaluateReport(null, { minPassed: 17 }).ok).toBe(false);
    expect(evaluateReport([], { minPassed: 17 }).ok).toBe(false);
  });

  it("fails on zero tests", () => {
    const result = evaluateReport(
      baseReport({
        numPassedTests: 0,
        numFailedTests: 0,
        numPendingTests: 0,
        numTodoTests: 0,
        numTotalTests: 0,
      }),
      { minPassed: 1 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/zero tests/);
  });

  it("fails when success is false even if counters look green", () => {
    const result = evaluateReport(baseReport({ success: false }), {
      minPassed: 17,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/success=false/);
  });

  it("fails when assertion statuses disagree with counters", () => {
    const result = evaluateReport(
      baseReport({
        testResults: [
          {
            assertionResults: [
              { status: "passed" },
              { status: "passed" },
            ],
          },
        ],
      }),
      { minPassed: 17 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/disagree with counters/);
  });

  it("passes when assertion statuses match counters", () => {
    const result = evaluateReport(
      baseReport({
        numPassedTests: 2,
        numTotalTests: 2,
        testResults: [
          {
            assertionResults: [{ status: "passed" }, { status: "passed" }],
          },
        ],
      }),
      { minPassed: 2 },
    );
    expect(result.ok).toBe(true);
  });

  it("allows incomplete only when strict=false", () => {
    const report = baseReport({
      numPassedTests: 16,
      numPendingTests: 1,
      numTotalTests: 17,
    });
    expect(evaluateReport(report, { minPassed: 16, strict: false }).ok).toBe(
      true,
    );
    expect(evaluateReport(report, { minPassed: 16, strict: true }).ok).toBe(
      false,
    );
  });
});

describe("assert-vitest-json-passed CLI", () => {
  it("exits 0 for a valid strict report", () => {
    const file = writeReport(
      baseReport({ numPassedTests: 3, numTotalTests: 3 }),
    );
    const result = runCli([file, "--min-passed=3"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Vitest gate OK/);
  });

  it("exits 1 for invalid JSON", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "af-vitest-gate-"));
    tempDirs.push(dir);
    const file = path.join(dir, "bad.json");
    writeFileSync(file, "{not-json", "utf8");
    const result = runCli([file, "--min-passed=1"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Unable to parse|JSON/);
  });

  it("exits 1 for missing file", () => {
    const result = runCli([
      path.join(tmpdir(), "missing-af-vitest-report.json"),
      "--min-passed=1",
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/not found/);
  });

  it("exits 1 for empty report file", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "af-vitest-gate-"));
    tempDirs.push(dir);
    const file = path.join(dir, "empty.json");
    writeFileSync(file, "   ", "utf8");
    const result = runCli([file, "--min-passed=1"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/empty/);
  });

  it("exits 1 when pending tests are present (strict default)", () => {
    const file = writeReport(
      baseReport({
        numPassedTests: 16,
        numPendingTests: 1,
        numTotalTests: 17,
      }),
    );
    const result = runCli([file, "--min-passed=17"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/incomplete/);
  });
});
