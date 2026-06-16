#!/usr/bin/env node
/**
 * Career Suite provider runtime local preflight.
 * Validates env presence and flag hierarchy only — no Nango or Google network calls.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runBuild() {
  const result = spawnSync("pnpm", ["--filter", "@devflow/career-sync", "build"], {
    cwd: root,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  runBuild();

  const {
    evaluateCareerProviderRuntimePreflight,
    formatCareerProviderRuntimePreflightLines,
    assertPreflightOutputIsSafe,
  } = await import(
    path.join(root, "packages/career-sync/dist/provider-runtime-preflight/index.js")
  );

  const env = {
    CAREER_PROVIDER_RUNTIME_ENABLED: process.env.CAREER_PROVIDER_RUNTIME_ENABLED,
    NANGO_RUNTIME_ENABLED: process.env.NANGO_RUNTIME_ENABLED,
    GMAIL_PROVIDER_ENABLED: process.env.GMAIL_PROVIDER_ENABLED,
    CALENDAR_PROVIDER_ENABLED: process.env.CALENDAR_PROVIDER_ENABLED,
    NANGO_SECRET_KEY: process.env.NANGO_SECRET_KEY,
  };

  const report = evaluateCareerProviderRuntimePreflight(env);
  const lines = formatCareerProviderRuntimePreflightLines(report);
  const output = lines.join("\n");

  assertPreflightOutputIsSafe(output, env);

  for (const line of lines) {
    console.log(line);
  }

  process.exit(report.status === "ready" ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Preflight failed");
  process.exit(1);
});
