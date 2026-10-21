import { classifyApplyFlowDbTarget } from "../../src/lib/persistence-v2/db-target-guard";
import { isApplyFlowE2ERuntimeAllowed } from "../../src/lib/e2e/runtime-guard";
import { seedE2EApplyFlowAccount } from "../../src/lib/e2e/v2-seed";

async function main() {
  // Default env read stays inside the guard (it casts process.env). Passing
  // Node's ProcessEnv directly fails Next's production typecheck.
  const classification = classifyApplyFlowDbTarget();
  console.log(
    JSON.stringify({
      e2eAllowed: isApplyFlowE2ERuntimeAllowed(),
      dbKind: classification.kind,
      dbHost: classification.dbHost,
      allowed: classification.allowedForDestructiveTests,
      reason: classification.reason,
    }),
  );
  try {
    const seeded = await seedE2EApplyFlowAccount({
      authProviderSub: "e2e_applyflow_personal_a",
      pilotEligible: true,
      v2Cloud: true,
    });
    console.log(JSON.stringify({ seed: "ok", accountId: seeded.accountId }));
  } catch (error) {
    console.log(
      JSON.stringify({
        seed: "fail",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split("\n").slice(0, 6) : undefined,
      }),
    );
    process.exitCode = 1;
  }
}

void main();
