import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { evaluateRules, evaluateConditions } from "@/modules/automation";
import { prisma } from "@/lib/prisma";
import type {
  AutomationEvent,
  AutomationContext,
  Condition,
} from "@/modules/automation/automation.types";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const tenantId = auth.payload.tenantId;
  const { id: ruleId } = await context.params;
  if (!ruleId) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  let body: { threadId?: string; messageText?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const rule = await prisma.waAutomationRule.findFirst({
    where: { id: ruleId, tenantId },
  });
  if (!rule) return NextResponse.json({ error: "Regra não encontrada" }, { status: 404 });

  const threadId = body.threadId;
  if (!threadId) {
    return NextResponse.json({ error: "threadId obrigatório para testar" }, { status: 400 });
  }

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
  if (!thread) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const event: AutomationEvent = {
    triggerType: rule.triggerType as AutomationEvent["triggerType"],
    tenantId,
    threadId,
    messageText: body.messageText,
    direction: "INBOUND",
  };

  const ctx: AutomationContext = {
    tenantId,
    threadId,
    executionId: randomUUID(),
    depth: 0,
    ruleIdsExecuted: new Set(),
    messageText: body.messageText,
    thread: {
      status: thread.status,
      assignedToUserId: thread.assignedToUserId,
      lastMessageAt: thread.lastMessageAt,
      lastCustomerMessageAt: thread.lastCustomerMessageAt,
      tags: thread.threadTags?.map((tt) => ({ id: tt.tag.id, name: tt.tag.name })) ?? [],
    },
  };

  const conditions = (rule.conditions as Condition[]) ?? [];
  const conditionsMatch = evaluateConditions(conditions, event, ctx);
  const matchingRules = await evaluateRules(event, ctx);
  const wouldExecute = matchingRules.some((r) => r.id === ruleId);

  return NextResponse.json({
    success: true,
    data: {
      conditionsMatch,
      wouldExecute,
      matchingRulesCount: matchingRules.length,
      conditions: conditions,
      actions: rule.actions,
    },
  });
}
