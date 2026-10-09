#!/usr/bin/env node
/**
 * Replacement for `npx turbo-ignore applyflow` on Vercel.
 *
 * turbo-ignore 2.11.7 keeps `VERCEL_GIT_PREVIOUS_SHA` in the environment and
 * also puts that same SHA in `--filter=applyflow...[SHA]`. turbo 2.8.17 then
 * returns `"packages": []` even when `apps/applyflow` or its dependencies
 * changed, and the ignore command exits 0. Unsetting the variable for the
 * child leaves the filter as the only range, so a real ApplyFlow change
 * builds and a portal-only change can still skip.
 *
 * Exit 0 skips the deployment. Any other status builds.
 * This file does not set `TURBO_FORCE`.
 *
 * The Vercel project command is still `cd ../.. && npx turbo-ignore applyflow`.
 * Switching it is a separate production-config change:
 *   cd ../.. && node scripts/applyflow-vercel-ignore.mjs
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const WORKSPACE = "applyflow";
const TURBO_SPEC = "turbo@2.8.17";

export function childEnvWithoutPreviousSha(env) {
  const next = { ...env };
  delete next.VERCEL_GIT_PREVIOUS_SHA;
  delete next.TURBO_FORCE;
  return next;
}

/** Exit 0 only when turbo reports no affected packages. Missing data builds. */
export function ignoreExitCode(packages) {
  if (!Array.isArray(packages)) return 1;
  return packages.length === 0 ? 0 : 1;
}

function previousSha() {
  const sha = process.env.VERCEL_GIT_PREVIOUS_SHA ?? "";
  return /^[0-9a-f]{40}$/i.test(sha) ? sha : null;
}

function shaExists(sha) {
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function turboArgs(sha) {
  const filter = `--filter=${WORKSPACE}...[${sha}]`;
  const task = ["run", "build", filter, "--dry=json"];
  if (process.env.APPLYFLOW_TURBO_BIN) return { command: process.env.APPLYFLOW_TURBO_BIN, args: task };
  try {
    const require = createRequire(path.join(process.cwd(), "package.json"));
    const shim = require.resolve("turbo/bin/turbo");
    return { command: process.execPath, args: [shim, ...task] };
  } catch {
    return { command: "npx", args: ["-y", TURBO_SPEC, ...task] };
  }
}

function affectedPackages(sha) {
  const { command, args } = turboArgs(sha);
  const stdout = execFileSync(command, args, {
    env: childEnvWithoutPreviousSha(process.env),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "inherit"],
  });
  const parsed = JSON.parse(stdout.slice(stdout.indexOf("{")));
  return parsed.packages;
}

function main() {
  const sha = previousSha();
  if (!sha) {
    console.log("applyflow-vercel-ignore: previous SHA missing, building");
    process.exit(1);
  }
  if (!shaExists(sha)) {
    console.log("applyflow-vercel-ignore: previous SHA is not in this clone, building");
    process.exit(1);
  }
  let packages;
  try {
    packages = affectedPackages(sha);
  } catch (error) {
    console.log("applyflow-vercel-ignore: turbo comparison failed, building");
    console.error(error instanceof Error ? error.message : "turbo failed");
    process.exit(1);
  }
  const code = ignoreExitCode(packages);
  if (code === 0) {
    console.log("applyflow-vercel-ignore: applyflow is unaffected, skip");
  } else {
    console.log("applyflow-vercel-ignore: applyflow or a dependency changed, building");
  }
  process.exit(code);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
