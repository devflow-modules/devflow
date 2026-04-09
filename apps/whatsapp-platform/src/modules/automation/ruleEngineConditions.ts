/**
 * Avaliação de condições do Rule Engine v1 (campos inbox + operadores numéricos).
 */

import type { AutomationContext, AutomationEvent, Condition, ConditionOperator } from "./automation.types";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function cmp(
  op: ConditionOperator,
  left: number,
  right: number
): boolean {
  switch (op) {
    case "equals":
      return left === right;
    case "notEquals":
      return left !== right;
    case "gt":
      return left > right;
    case "gte":
      return left >= right;
    case "lt":
      return left < right;
    case "lte":
      return left <= right;
    default:
      return false;
  }
}

function lastInboundMinutesAgo(context: AutomationContext): number | null {
  const t = context.thread;
  const raw =
    t?.lastInboundMessageAt ??
    t?.lastUnansweredInboundAt ??
    (t?.lastCustomerMessageAt ? new Date(t.lastCustomerMessageAt).toISOString() : null);
  if (!raw) return null;
  return (Date.now() - new Date(raw).getTime()) / 60_000;
}

export function evaluateStructuredCondition(
  condition: Condition,
  event: AutomationEvent,
  context: AutomationContext
): boolean {
  const { field, operator, value } = condition;

  switch (field) {
    case "conversationState": {
      const cur = context.thread?.conversationState ?? event.thread?.conversationState;
      if (cur === undefined) return false;
      return String(cur) === String(value ?? "");
    }
    case "slaLevel": {
      const cur = context.thread?.slaLevel ?? event.thread?.slaLevel;
      if (cur === undefined || cur === null) return false;
      return String(cur) === String(value ?? "");
    }
    case "isUnassigned": {
      const cur =
        context.thread?.isUnassigned ??
        (context.thread?.assignedToUserId == null);
      const want = value === true || String(value).toLowerCase() === "true";
      return Boolean(cur) === want;
    }
    case "hasTag": {
      const needle = String(value ?? "").trim().toLowerCase();
      if (!needle) return false;
      const tags = context.thread?.tags ?? event.thread?.tags ?? [];
      return tags.some(
        (t) =>
          t.id.toLowerCase() === needle ||
          t.name.trim().toLowerCase() === needle ||
          t.name.trim().toLowerCase().includes(needle)
      );
    }
    case "lastInboundMinutesAgo": {
      const minutes = lastInboundMinutesAgo(context);
      if (minutes === null) return false;
      const target = num(value);
      if (!Number.isFinite(target)) return false;
      if (operator === "equals") return Math.abs(minutes - target) < 0.5;
      if (operator === "timeSinceLastMessage_gt") return minutes * 60 > target;
      return cmp(operator, minutes, target);
    }
    default:
      return legacyEvaluate(condition, event, context);
  }
}

function legacyEvaluate(
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

export function evaluateAllConditions(
  conditions: Condition[],
  event: AutomationEvent,
  context: AutomationContext
): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((c) => evaluateStructuredCondition(c, event, context));
}
