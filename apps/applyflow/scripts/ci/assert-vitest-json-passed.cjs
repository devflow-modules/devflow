#!/usr/bin/env node
/**
 * Fail CI when a Vitest JSON report has fewer passed tests than required,
 * or when the suite is unexpectedly empty/skipped.
 *
 * Usage:
 *   node ./scripts/ci/assert-vitest-json-passed.cjs ./result.json --min-passed=17
 */
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

function usage() {
  console.error(
    "Usage: node assert-vitest-json-passed.cjs <report.json> --min-passed=<n>",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 1) usage();

const reportPath = resolve(process.cwd(), args[0]);
const minArg = args.find((a) => a.startsWith("--min-passed="));
const minPassed = minArg ? Number(minArg.split("=")[1]) : NaN;
if (!Number.isFinite(minPassed) || minPassed < 1) usage();

let report;
try {
  report = JSON.parse(readFileSync(reportPath, "utf8"));
} catch (error) {
  console.error(`Unable to read Vitest JSON report at ${reportPath}`);
  console.error(String(error?.message || error));
  process.exit(1);
}

const passed = Number(report?.numPassedTests ?? report?.numPassedTestSuites ?? 0);
const failed = Number(report?.numFailedTests ?? 0);
const skipped = Number(report?.numSkippedTests ?? 0);
const total = Number(report?.numTotalTests ?? passed + failed + skipped);

if (failed > 0) {
  console.error(`Vitest report has failing tests: failed=${failed}`);
  process.exit(1);
}

if (passed < minPassed) {
  console.error(
    `Vitest passed count below threshold: passed=${passed} min=${minPassed} skipped=${skipped} total=${total}`,
  );
  process.exit(1);
}

console.log(
  `Vitest gate OK: passed=${passed} failed=${failed} skipped=${skipped} total=${total} min=${minPassed}`,
);
