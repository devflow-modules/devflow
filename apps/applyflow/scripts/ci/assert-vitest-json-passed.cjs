#!/usr/bin/env node
/**
 * Fail CI when a Vitest JSON report is incomplete, inconsistent, or below the
 * required passed threshold.
 *
 * Vitest JSON reporter (v4 / Jest-compatible) fields used:
 *   numPassedTests, numFailedTests, numPendingTests, numTodoTests,
 *   numTotalTests, success, testResults[]
 *
 * Optional legacy field: numSkippedTests (counted as incomplete when present).
 *
 * Strict mode (default) rejects skipped/pending/todo and incomplete runs.
 *
 * Usage:
 *   node ./scripts/ci/assert-vitest-json-passed.cjs ./result.json --min-passed=17
 *   node ./scripts/ci/assert-vitest-json-passed.cjs ./result.json --min-passed=3 --strict
 *   node ./scripts/ci/assert-vitest-json-passed.cjs ./result.json --min-passed=3 --allow-incomplete
 */
"use strict";

const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");

function usage(message) {
  if (message) console.error(message);
  console.error(
    "Usage: node assert-vitest-json-passed.cjs <report.json> --min-passed=<n> [--strict|--allow-incomplete]",
  );
  process.exit(2);
}

function isNonNegativeInt(value) {
  return Number.isInteger(value) && value >= 0 && Number.isFinite(value);
}

function readCount(report, key) {
  if (!Object.prototype.hasOwnProperty.call(report, key)) return null;
  return report[key];
}

/**
 * @param {unknown} report
 * @param {{ minPassed: number, strict?: boolean }} options
 * @returns {{ ok: true, summary: string } | { ok: false, code: number, message: string }}
 */
function evaluateReport(report, options) {
  const minPassed = options.minPassed;
  const strict = options.strict !== false;

  if (report == null || typeof report !== "object" || Array.isArray(report)) {
    return { ok: false, code: 1, message: "Vitest report is empty or not an object" };
  }

  const requiredKeys = [
    "numPassedTests",
    "numFailedTests",
    "numPendingTests",
    "numTodoTests",
    "numTotalTests",
  ];
  for (const key of requiredKeys) {
    if (!Object.prototype.hasOwnProperty.call(report, key)) {
      return {
        ok: false,
        code: 1,
        message: `Vitest report missing required field: ${key}`,
      };
    }
  }

  const raw = {
    passed: readCount(report, "numPassedTests"),
    failed: readCount(report, "numFailedTests"),
    pending: readCount(report, "numPendingTests"),
    todo: readCount(report, "numTodoTests"),
    total: readCount(report, "numTotalTests"),
    skippedLegacy: Object.prototype.hasOwnProperty.call(report, "numSkippedTests")
      ? report.numSkippedTests
      : 0,
  };

  for (const [name, value] of Object.entries(raw)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return {
        ok: false,
        code: 1,
        message: `Vitest report field is not a finite number: ${name}=${String(value)}`,
      };
    }
    if (!Number.isInteger(value)) {
      return {
        ok: false,
        code: 1,
        message: `Vitest report field is not an integer: ${name}=${value}`,
      };
    }
    if (value < 0) {
      return {
        ok: false,
        code: 1,
        message: `Vitest report field is negative: ${name}=${value}`,
      };
    }
  }

  const passed = raw.passed;
  const failed = raw.failed;
  const pending = raw.pending;
  const todo = raw.todo;
  const skipped = raw.skippedLegacy;
  const total = raw.total;
  const incomplete = pending + todo + skipped;

  if (Object.prototype.hasOwnProperty.call(report, "success")) {
    if (typeof report.success !== "boolean") {
      return {
        ok: false,
        code: 1,
        message: `Vitest report success must be boolean when present: ${typeof report.success}`,
      };
    }
    if (report.success !== true) {
      return {
        ok: false,
        code: 1,
        message: `Vitest report success=false (passed=${passed} failed=${failed} pending=${pending} todo=${todo} total=${total})`,
      };
    }
  }

  const expectedTotal = passed + failed + pending + todo;
  // Legacy skipped is outside the Jest-compatible identity; if present and >0 it
  // must still fail strict mode, but total identity uses Vitest's native fields.
  if (total !== expectedTotal) {
    return {
      ok: false,
      code: 1,
      message: `Vitest total inconsistent: total=${total} expected=${expectedTotal} (passed+failed+pending+todo)`,
    };
  }

  if (total === 0 || passed === 0 && failed === 0 && incomplete === 0) {
    return {
      ok: false,
      code: 1,
      message: `Vitest report has zero tests: total=${total}`,
    };
  }

  if (failed > 0) {
    return {
      ok: false,
      code: 1,
      message: `Vitest report has failing tests: failed=${failed}`,
    };
  }

  if (strict && incomplete > 0) {
    return {
      ok: false,
      code: 1,
      message: `Vitest report has incomplete tests under strict mode: pending=${pending} todo=${todo} skipped=${skipped}`,
    };
  }

  if (passed < minPassed) {
    return {
      ok: false,
      code: 1,
      message: `Vitest passed count below threshold: passed=${passed} min=${minPassed} pending=${pending} todo=${todo} skipped=${skipped} total=${total}`,
    };
  }

  if (Array.isArray(report.testResults)) {
    let statusPassed = 0;
    let statusFailed = 0;
    let statusPending = 0;
    let statusTodo = 0;
    let unknown = 0;
    for (const suite of report.testResults) {
      const assertions = Array.isArray(suite?.assertionResults)
        ? suite.assertionResults
        : [];
      for (const assertion of assertions) {
        const status = String(assertion?.status || "");
        if (status === "passed") statusPassed += 1;
        else if (status === "failed") statusFailed += 1;
        else if (status === "pending" || status === "skipped") statusPending += 1;
        else if (status === "todo") statusTodo += 1;
        else unknown += 1;
      }
    }
    const counted = statusPassed + statusFailed + statusPending + statusTodo;
    if (counted > 0) {
      if (
        statusPassed !== passed ||
        statusFailed !== failed ||
        statusPending !== pending ||
        statusTodo !== todo
      ) {
        return {
          ok: false,
          code: 1,
          message: `Vitest suite statuses disagree with counters: statuses(passed=${statusPassed},failed=${statusFailed},pending=${statusPending},todo=${statusTodo}) counters(passed=${passed},failed=${failed},pending=${pending},todo=${todo})`,
        };
      }
    }
    if (unknown > 0) {
      return {
        ok: false,
        code: 1,
        message: `Vitest report has unknown assertion statuses: unknown=${unknown}`,
      };
    }
  }

  return {
    ok: true,
    summary: `Vitest gate OK: passed=${passed} failed=${failed} pending=${pending} todo=${todo} skipped=${skipped} total=${total} min=${minPassed} strict=${strict}`,
  };
}

function parseArgs(argv) {
  const args = argv.slice();
  if (args.length < 1) usage();

  const reportArg = args.find((a) => !a.startsWith("--"));
  if (!reportArg) usage("Missing report path");

  const minArg = args.find((a) => a.startsWith("--min-passed="));
  const minPassed = minArg ? Number(minArg.split("=")[1]) : NaN;
  if (!Number.isFinite(minPassed) || !Number.isInteger(minPassed) || minPassed < 1) {
    usage("--min-passed must be a positive integer");
  }

  const allowIncomplete = args.includes("--allow-incomplete");
  const strictFlag = args.includes("--strict");
  // Default strict=true for F3.5 / scopes-default safety. --allow-incomplete opts out.
  const strict = allowIncomplete ? false : true;
  if (strictFlag && allowIncomplete) {
    usage("Use either --strict or --allow-incomplete, not both");
  }

  return { reportPath: resolve(process.cwd(), reportArg), minPassed, strict };
}

function main(argv = process.argv.slice(2)) {
  const { reportPath, minPassed, strict } = parseArgs(argv);

  if (!existsSync(reportPath)) {
    console.error(`Vitest JSON report not found: ${reportPath}`);
    process.exit(1);
  }

  let report;
  try {
    const raw = readFileSync(reportPath, "utf8");
    if (!raw || !raw.trim()) {
      console.error(`Vitest JSON report is empty: ${reportPath}`);
      process.exit(1);
    }
    report = JSON.parse(raw);
  } catch (error) {
    console.error(`Unable to parse Vitest JSON report at ${reportPath}`);
    console.error(String(error?.message || error));
    process.exit(1);
  }

  const result = evaluateReport(report, { minPassed, strict });
  if (!result.ok) {
    console.error(result.message);
    process.exit(result.code);
  }
  console.log(result.summary);
}

if (require.main === module) {
  main();
}

module.exports = {
  evaluateReport,
  parseArgs,
  isNonNegativeInt,
  main,
};
