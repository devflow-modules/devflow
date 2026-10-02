/**
 * Operator-only Sentry ingest verification.
 *
 * Sends ONE sanitized ApplyFlow test event through the same boundary/transport
 * used in production. Never prints the DSN. Refuses Production unless explicitly confirmed.
 *
 * Usage:
 *   cd apps/applyflow
 *   pnpm sentry:verify
 *
 * Production gate:
 *   APPLYFLOW_SENTRY_VERIFY_CONFIRM=I_UNDERSTAND pnpm sentry:verify
 */

import {
  captureApplyFlowException,
  getLastApplyFlowErrorTransportOutcomeForTests,
  getLastCapturedApplyFlowErrorForTests,
  resetApplyFlowErrorTrackingForTests,
} from "../../src/lib/observability/error-tracking";

function has(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

async function main(): Promise<void> {
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  const nodeEnv = process.env.NODE_ENV?.trim();
  const isProductionLike = vercelEnv === "production" || nodeEnv === "production";

  if (isProductionLike && process.env.APPLYFLOW_SENTRY_VERIFY_CONFIRM !== "I_UNDERSTAND") {
    console.error(
      "REFUSED: Production-like verify requires APPLYFLOW_SENTRY_VERIFY_CONFIRM=I_UNDERSTAND",
    );
    process.exit(2);
  }

  if (!has("APPLYFLOW_SENTRY_DSN") && !has("NEXT_PUBLIC_APPLYFLOW_SENTRY_DSN") && !has("SENTRY_DSN")) {
    console.error("FAIL: APPLYFLOW_SENTRY_DSN (or SENTRY_DSN) is required");
    process.exit(1);
  }

  resetApplyFlowErrorTrackingForTests();

  const release =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim()?.slice(0, 12) ||
    process.env.GITHUB_SHA?.trim()?.slice(0, 12) ||
    "local-verify";
  const environment = vercelEnv || (isProductionLike ? "production" : "development");

  captureApplyFlowException(new Error("applyflow_sentry_verify"), {
    area: "server",
    route: "operator/sentry-verify",
    errorCode: "sentry_verify",
    release,
    environment,
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const outcome = getLastApplyFlowErrorTransportOutcomeForTests();
  const captured = getLastCapturedApplyFlowErrorForTests();

  if (!captured || captured.message !== "applyflow_sentry_verify") {
    console.error("FAIL: capture boundary did not record sanitized verify event");
    process.exit(1);
  }

  if (outcome === "failed") {
    console.error("FAIL: Sentry transport failed (see sanitized console fallback)");
    process.exit(1);
  }

  if (outcome === "noop") {
    console.error("FAIL: transport noop — DSN not resolved at runtime");
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      ok: true,
      event: "applyflow_sentry_verify",
      environment,
      release,
      outcome: outcome ?? "sent",
      note: "Confirm event in Sentry project applyflow. DSN not printed.",
    }),
  );
}

main().catch((error) => {
  console.error("FAIL: sentry verify crashed:", error instanceof Error ? error.message : "unknown");
  process.exit(1);
});
