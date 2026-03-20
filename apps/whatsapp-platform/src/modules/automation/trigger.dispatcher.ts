/**
 * Trigger dispatcher — recebe eventos e dispara o rule engine.
 * Feature gating: AUTOMATION bloqueado em plano FREE.
 */

import { evaluateRules } from "./rule.engine";
import { executeAction, canExecuteMore } from "./action.executor";
import type { AutomationEvent, AutomationContext } from "./automation.types";
import { prisma } from "@/lib/prisma";
import { assertFeature } from "@/modules/billing/featureGate";
import { incrementUsage, checkLimit } from "@/modules/billing/usage.service";
import { UsageMetricType } from "@/generated/prisma-whatsapp";

const MAX_DEPTH = 5;

async function loadThreadContext(
  tenantId: string,
  threadId: string
): Promise<AutomationContext["thread"]> {
  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: {
      status: true,
      assignedToUserId: true,
      lastMessageAt: true,
      lastCustomerMessageAt: true,
      threadTags: { include: { tag: true } },
    },
  });
  if (!thread) return undefined;
  return {
    status: thread.status,
    assignedToUserId: thread.assignedToUserId,
    lastMessageAt: thread.lastMessageAt,
    lastCustomerMessageAt: thread.lastCustomerMessageAt,
    tags: thread.threadTags?.map((tt) => ({ id: tt.tag.id, name: tt.tag.name })) ?? [],
  };
}

export async function dispatchEvent(event: AutomationEvent): Promise<void> {
  try {
    await assertFeature(event.tenantId, "AUTOMATION");
  } catch {
    return; // Plano não permite automação
  }

  const limitCheck = await checkLimit(event.tenantId, UsageMetricType.AUTOMATIONS);
  if (!limitCheck.ok) return;

  const executionId = crypto.randomUUID();
  const context: AutomationContext = {
    tenantId: event.tenantId,
    threadId: event.threadId,
    executionId,
    depth: 0,
    ruleIdsExecuted: new Set(),
    messageText: event.messageText,
    messageId: event.messageId,
    direction: event.direction,
    status: event.status,
    tagId: event.tagId,
    assignedToUserId: event.assignedToUserId,
    thread: event.thread ?? (await loadThreadContext(event.tenantId, event.threadId)),
  };

  try {
    const rules = await evaluateRules(event, context);
    for (const rule of rules) {
      if (!canExecuteMore(context)) break;
      context.ruleIdsExecuted.add(rule.id);
      context.depth += 1;

      for (const action of rule.actions) {
        const result = await executeAction(action, context);
        if (!result.ok) {
          console.warn("[automation] rule action failed", rule.name, action.type, result.error);
        }
      }
    }
    if (rules.length > 0) {
      await incrementUsage(event.tenantId, UsageMetricType.AUTOMATIONS);
    }
  } catch (e) {
    console.error("[automation] dispatch failed", event.triggerType, event.threadId, e);
  }
}
