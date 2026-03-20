/**
 * Playbook engine — executa steps em sequência com suporte a delay.
 */

import { prisma } from "@/lib/prisma";
import { executeAction, canExecuteMore } from "./action.executor";
import type { AutomationContext, PlaybookStep, PlaybookRow } from "./automation.types";
import { randomUUID } from "crypto";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getPlaybook(
  tenantId: string,
  playbookId: string
): Promise<PlaybookRow | null> {
  const row = await prisma.waAutomationPlaybook.findFirst({
    where: { id: playbookId, tenantId, isActive: true },
  });
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    isActive: row.isActive,
    steps: (row.steps as PlaybookStep[]) ?? [],
  };
}

export async function executePlaybook(
  playbookId: string,
  context: Omit<AutomationContext, "executionId" | "depth" | "ruleIdsExecuted">
): Promise<{ ok: boolean; stepsExecuted: number; error?: string }> {
  const playbook = await getPlaybook(context.tenantId, playbookId);
  if (!playbook) return { ok: false, stepsExecuted: 0, error: "playbook_not_found" };

  const fullContext: AutomationContext = {
    ...context,
    executionId: randomUUID(),
    depth: 0,
    ruleIdsExecuted: new Set(),
  };

  let stepsExecuted = 0;
  try {
    for (const step of playbook.steps) {
      if (!canExecuteMore(fullContext)) break;

      if (step.type === "delay" && step.delayMs) {
        await sleep(step.delayMs);
        stepsExecuted += 1;
        continue;
      }

      if (step.type === "action" && step.action) {
        fullContext.depth += 1;
        const result = await executeAction(step.action, fullContext);
        stepsExecuted += 1;
        if (!result.ok) {
          return { ok: false, stepsExecuted, error: result.error };
        }
      }
    }
    return { ok: true, stepsExecuted };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[automation] playbook failed", playbookId, msg);
    return { ok: false, stepsExecuted, error: msg };
  }
}
