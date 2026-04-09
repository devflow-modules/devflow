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
import { getWaInboxThreadInboxMetrics } from "@/modules/inbox/waInboxThreadMetrics";
import { logAction } from "@/modules/inbox";

const MAX_DEPTH = 5;
const AUTOMATION_AUDIT_USER = "automation";

async function loadAutomationThreadContext(
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
  const metrics = await getWaInboxThreadInboxMetrics(tenantId, threadId);
  return {
    status: thread.status,
    assignedToUserId: thread.assignedToUserId,
    lastMessageAt: thread.lastMessageAt,
    lastCustomerMessageAt: thread.lastCustomerMessageAt,
    tags: thread.threadTags?.map((tt) => ({ id: tt.tag.id, name: tt.tag.name })) ?? [],
    conversationState: metrics?.conversationState,
    slaLevel: metrics?.slaLevel ?? null,
    isUnassigned: metrics?.isUnassigned,
    responseDelayMs: metrics?.responseDelayMs ?? null,
    lastUnansweredInboundAt: metrics?.lastUnansweredInboundAt ?? null,
    lastInboundMessageAt: metrics?.lastInboundMessageAt ?? null,
  };
}

export async function dispatchEvent(event: AutomationEvent): Promise<{ rulesApplied: number }> {
  try {
    await assertFeature(event.tenantId, "AUTOMATION");
  } catch {
    return { rulesApplied: 0 };
  }

  const limitCheck = await checkLimit(event.tenantId, UsageMetricType.AUTOMATIONS);
  if (!limitCheck.ok) return { rulesApplied: 0 };

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
    thread: event.thread ?? (await loadAutomationThreadContext(event.tenantId, event.threadId)),
  };

  let rulesApplied = 0;
  try {
    const rules = await evaluateRules(event, context);
    for (const rule of rules) {
      if (!canExecuteMore(context)) break;
      context.ruleIdsExecuted.add(rule.id);
      context.depth += 1;

      let anyOk = false;
      for (const action of rule.actions) {
        const result = await executeAction(action, context);
        if (result.ok) anyOk = true;
        if (!result.ok) {
          console.warn("[automation] rule action failed", rule.name, action.type, result.error);
        }
      }
      if (anyOk) {
        rulesApplied += 1;
        await logAction(
          event.tenantId,
          event.threadId,
          AUTOMATION_AUDIT_USER,
          "automation_log",
          {
            ruleEngine: "v1",
            ruleId: rule.id,
            ruleName: rule.name,
            triggerType: event.triggerType,
          }
        );
      }
    }
    if (rules.length > 0) {
      await incrementUsage(event.tenantId, UsageMetricType.AUTOMATIONS);
    }
  } catch (e) {
    console.error("[automation] dispatch failed", event.triggerType, event.threadId, e);
  }
  return { rulesApplied };
}
