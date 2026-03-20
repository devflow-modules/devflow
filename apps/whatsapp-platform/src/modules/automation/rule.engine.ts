/**
 * Rule engine — avalia condições e retorna regras que devem executar.
 */

import { prisma } from "@/lib/prisma";
import type {
  AutomationEvent,
  AutomationContext,
  AutomationRuleRow,
  Condition,
  Action,
} from "./automation.types";

export async function getActiveRulesByTrigger(
  tenantId: string,
  triggerType: string
): Promise<AutomationRuleRow[]> {
  const rows = await prisma.waAutomationRule.findMany({
    where: { tenantId, isActive: true, triggerType },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    name: r.name,
    isActive: r.isActive,
    triggerType: r.triggerType,
    conditions: (r.conditions as Condition[]) ?? [],
    actions: (r.actions as Action[]) ?? [],
  })) as AutomationRuleRow[];
}

function evaluateCondition(
  condition: Condition,
  event: AutomationEvent,
  context: AutomationContext
): boolean {
  const { field, operator, value } = condition;

  const getField = (): unknown => {
    switch (field) {
      case "messageText":
      case "message":
        return event.messageText ?? context.messageText ?? "";
      case "status":
        return event.status ?? context.status ?? context.thread?.status;
      case "assignedToUserId":
      case "assignedTo":
        return event.assignedToUserId ?? context.assignedToUserId ?? context.thread?.assignedToUserId;
      case "tagId":
        return event.tagId;
      case "direction":
        return event.direction ?? context.direction;
      default:
        return undefined;
    }
  };

  const fieldVal = getField();

  switch (operator) {
    case "contains": {
      const str = String(fieldVal ?? "").toLowerCase();
      const needle = String(value ?? "").toLowerCase();
      return str.includes(needle);
    }
    case "equals":
      return String(fieldVal ?? "") === String(value ?? "");
    case "notEquals":
      return String(fieldVal ?? "") !== String(value ?? "");
    case "exists": {
      if (field === "tagId" || field === "tagName") {
        const tags = context.thread?.tags ?? [];
        const tagName = value as string;
        return tags.some((t) => (typeof t === "string" ? t === tagName : t.name === tagName));
      }
      const v = fieldVal;
      return v !== undefined && v !== null && v !== "";
    }
    case "isNull":
      return fieldVal === undefined || fieldVal === null || fieldVal === "";
    case "timeSinceLastMessage_gt": {
      const secs = Number(value ?? 0);
      const lastAt = context.thread?.lastCustomerMessageAt ?? context.thread?.lastMessageAt;
      if (!lastAt) return false;
      const elapsed = (Date.now() - new Date(lastAt).getTime()) / 1000;
      return elapsed > secs;
    }
    default:
      return false;
  }
}

export function evaluateConditions(
  conditions: Condition[],
  event: AutomationEvent,
  context: AutomationContext
): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, event, context));
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
