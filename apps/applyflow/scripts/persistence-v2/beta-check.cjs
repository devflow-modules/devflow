/**
 * Closed-beta readiness check — presence/policy only.
 * Never prints env values. Never queries production destructively.
 *
 * Exit codes:
 * 0 = pass
 * 1 = fail (blocking)
 * 2 = warn-only issues reported (still exit 0 unless --strict)
 */
const path = require("node:path");

function has(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

function isTrue(name) {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function isFalse(name) {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "0" || value === "false" || value === "no" || value === "off";
}

function main() {
  const strict = process.argv.includes("--strict");
  const failures = [];
  const warnings = [];

  const vercelEnv = process.env.VERCEL_ENV?.trim();
  const hosted = vercelEnv === "production" || vercelEnv === "preview" || process.env.VERCEL === "1";

  // Dangerous E2E flags must never be on hosted platforms.
  if (hosted && isTrue("APPLYFLOW_E2E")) {
    failures.push("APPLYFLOW_E2E must not be enabled on Vercel hosted environments");
  }
  if (hosted && isTrue("APPLYFLOW_E2E_PROVIDER_FIXTURES")) {
    failures.push("APPLYFLOW_E2E_PROVIDER_FIXTURES must not be enabled on hosted environments");
  }

  // TheirStack shared disable policy for closed beta.
  if (hosted && !isFalse("APPLYFLOW_THEIRSTACK_ENABLED")) {
    // Missing/false is OK; explicit true on hosted is a fail.
    if (isTrue("APPLYFLOW_THEIRSTACK_ENABLED")) {
      failures.push("APPLYFLOW_THEIRSTACK_ENABLED must be false on shared/hosted closed beta");
    }
  }

  if (!has("NEXT_PUBLIC_APPLYFLOW_URL") && hosted) {
    failures.push("NEXT_PUBLIC_APPLYFLOW_URL is required on hosted deployments for Origin allowlist");
  }

  if (isTrue("APPLYFLOW_PERSISTENCE_V2") && !has("DATABASE_URL")) {
    failures.push("APPLYFLOW_PERSISTENCE_V2=true requires DATABASE_URL");
  }

  if (!has("APPLYFLOW_SENTRY_DSN") && !has("SENTRY_DSN")) {
    warnings.push("Error tracking DSN not configured (OPERATOR ACTION REQUIRED)");
  }

  if (isTrue("APPLYFLOW_PERSISTENCE_V2") && !isTrue("APPLYFLOW_E2E")) {
    // Closed-beta V2 expects explicit operator awareness of backup ownership.
    warnings.push("Confirm closed-beta backup cadence before inviting 10–50 users (see docs/applyflow/BACKUP_RESTORE.md)");
  }

  for (const warning of warnings) {
    console.log(`WARN: ${warning}`);
  }
  for (const failure of failures) {
    console.log(`FAIL: ${failure}`);
  }

  if (failures.length === 0 && warnings.length === 0) {
    console.log("PASS: closed-beta config checks");
  } else if (failures.length === 0) {
    console.log("PASS_WITH_WARNINGS: closed-beta config checks");
  }

  if (failures.length > 0) {
    process.exit(1);
  }
  if (strict && warnings.length > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main();
