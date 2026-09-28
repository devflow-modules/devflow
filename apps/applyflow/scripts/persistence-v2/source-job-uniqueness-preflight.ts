/**
 * Operator CLI — AF-REL-001 read-only duplicate preflight.
 *
 * Reports duplicate (account_id, source_job_id) groups.
 * NEVER mutates data. NEVER auto-remediates.
 *
 * Usage (from apps/applyflow, with local DATABASE_URL set):
 *   pnpm exec tsx ./scripts/persistence-v2/source-job-uniqueness-preflight.ts
 */
import { PrismaClient } from "@prisma/client";

import {
  classifyApplyFlowDbTarget,
  sanitizeApplyFlowDbTargetForOperator,
} from "../../src/lib/persistence-v2/db-target-guard";
import { runSourceJobUniquenessPreflight } from "../../src/lib/persistence-v2/applications/source-job-uniqueness-preflight";

async function main(): Promise<void> {
  const classification = classifyApplyFlowDbTarget();
  const sanitized = sanitizeApplyFlowDbTargetForOperator(classification);

  process.stdout.write(
    `${JSON.stringify(
      {
        phase: "af_rel_001_preflight",
        target: sanitized,
        note: "read_only_no_mutation",
      },
      null,
      2,
    )}\n`,
  );

  if (!classification.allowedForDestructiveTests) {
    process.stderr.write(
      `${JSON.stringify({
        ok: false,
        error: "target_denied_or_missing",
        kind: classification.kind,
        reason: classification.reason,
        hint: "Set DATABASE_URL to local Docker (localhost / 127.0.0.1 only).",
      })}\n`,
    );
    process.exit(2);
  }

  const prisma = new PrismaClient();
  try {
    const result = await runSourceJobUniquenessPreflight(prisma);
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          mutated: result.mutated,
          duplicateGroupCount: result.duplicateGroupCount,
          duplicates: result.duplicates.map((d) => ({
            accountId: d.accountId,
            sourceJobId: d.sourceJobId,
            count: d.count,
            applicationIdCount: d.applicationIds.length,
            applicationIds: d.applicationIds,
          })),
          operatorAction:
            result.duplicateGroupCount === 0
              ? "none_safe_to_migrate"
              : "manual_remediation_required_before_unique_index",
        },
        null,
        2,
      )}\n`,
    );
    process.exit(result.duplicateGroupCount === 0 ? 0 : 1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : String(error),
    })}\n`,
  );
  process.exit(1);
});
