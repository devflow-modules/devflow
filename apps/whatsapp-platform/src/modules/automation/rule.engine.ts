/**
 * Rule engine — avalia condições e retorna regras que devem executar.
 */

import { prisma } from "@/lib/prisma";
import type { AutomationEvent, AutomationContext, AutomationRuleRow, Condition, Action } from "./automation.types";
import { evaluateAllConditions } from "./ruleEngineConditions";
import { normalizeTriggerType } from "./triggerNormalize";

export async function getActiveRulesByTrigger(
  tenantId: string,
  triggerType: string
): Promise<AutomationRuleRow[]> {
  const canonical = normalizeTriggerType(triggerType);
  const rows = await prisma.waAutomationRule.findMany({
    where: { tenantId, isActive: true, triggerType: canonical },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    name: r.name,
    isActive: r.isActive,
    isSystem: r.isSystem,
    triggerType: r.triggerType,
    conditions: (r.conditions as Condition[]) ?? [],
    actions: (r.actions as Action[]) ?? [],
  })) as AutomationRuleRow[];
}

export function evaluateConditions(
  conditions: Condition[],
  event: AutomationEvent,
  context: AutomationContext
): boolean {
  return evaluateAllConditions(conditions, event, context);
}

export async function evaluateRules(
  event: AutomationEvent,
  context: AutomationContext
): Promise<AutomationRuleRow[]> {
  const rules = await getActiveRulesByTrigger(context.tenantId, event.triggerType);
  return rules.filter((rule) => {
    if (context.ruleIdsExecuted.has(rule.id)) return false;
    return evaluateConditions(rule.conditions, event, context);
  });
}
