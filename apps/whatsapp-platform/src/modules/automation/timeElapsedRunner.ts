/**
 * Executa regras com trigger TIME_ELAPSED (cron / POST run-rules).
 */

import { prisma } from "@/lib/prisma";
import { dispatchEvent } from "./trigger.dispatcher";

export type RunTimeElapsedResult = {
  tenants: number;
  threadsScanned: number;
  rulesWithSuccess: number;
};

export async function runTimeElapsedRulesBatch(opts?: {
  tenantId?: string;
  threadLimit?: number;
}): Promise<RunTimeElapsedResult> {
  const threadLimit = opts?.threadLimit ?? 400;

  const tenantIds = opts?.tenantId
    ? [opts.tenantId]
    : (
        await prisma.waAutomationRule.findMany({
          where: { isActive: true, triggerType: "TIME_ELAPSED" },
          select: { tenantId: true },
          distinct: ["tenantId"],
        })
      ).map((r) => r.tenantId);

  let threadsScanned = 0;
  let rulesWithSuccess = 0;

  for (const tid of tenantIds) {
    const threads = await prisma.waInboxThread.findMany({
      where: { tenantId: tid, status: { not: "CLOSED" } },
      select: { id: true },
      take: threadLimit,
    });
    for (const t of threads) {
      threadsScanned += 1;
      const { rulesApplied } = await dispatchEvent({
        triggerType: "TIME_ELAPSED",
        tenantId: tid,
        threadId: t.id,
      });
      rulesWithSuccess += rulesApplied;
    }
  }

  return { tenants: tenantIds.length, threadsScanned, rulesWithSuccess };
}
