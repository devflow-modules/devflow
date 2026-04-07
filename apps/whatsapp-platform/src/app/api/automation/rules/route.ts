import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { recordPlatformAudit } from "@/lib/platformAuditLog";
import { getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import type { Condition, Action } from "@/modules/automation/automation.types";

export const dynamic = "force-dynamic";

const TRIGGER_TYPES = [
  "MESSAGE_INBOUND",
  "MESSAGE_OUTBOUND",
  "CONVERSATION_CREATED",
  "STATUS_CHANGED",
  "TAG_ADDED",
  "TAG_REMOVED",
  "TIME_ELAPSED",
] as const;

const conditionSchema = z.object({
  field: z.string(),
  operator: z.enum(["contains", "equals", "notEquals", "exists", "isNull", "timeSinceLastMessage_gt"]),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
});

const actionSchema = z.object({
  type: z.enum([
    "assignConversation",
    "updateStatus",
    "addTag",
    "removeTag",
    "setPriority",
    "sendMessage",
    "triggerAIResponse",
    "logAction",
  ]),
  params: z.record(z.unknown()).optional(),
});

const createRuleSchema = z.object({
  name: z.string().min(1).max(200),
  triggerType: z.enum(TRIGGER_TYPES),
  conditions: z.array(conditionSchema).default([]),
  actions: z.array(actionSchema).min(1),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const tenantId = auth.payload.tenantId;
  if (!tenantId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rules = await prisma.waAutomationRule.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: {
      rules: rules.map((r) => ({
        id: r.id,
        name: r.name,
        isActive: r.isActive,
        triggerType: r.triggerType,
        conditions: r.conditions,
        actions: r.actions,
        createdAt: r.createdAt.toISOString(),
      })),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const tenantId = auth.payload.tenantId;
  if (!tenantId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = createRuleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const rule = await prisma.waAutomationRule.create({
    data: {
      tenantId,
      name: parsed.data.name,
      triggerType: parsed.data.triggerType,
      conditions: parsed.data.conditions as object,
      actions: parsed.data.actions as object,
    },
  });

  recordPlatformAudit({
    action: "automation_rule_create",
    tenantId,
    userId: auth.payload.sub,
    resourceType: "wa_automation_rule",
    resourceId: rule.id,
    ip: getClientIp(request),
    metadata: { name: rule.name, triggerType: rule.triggerType },
  });

  return NextResponse.json({
    success: true,
    data: {
      rule: {
        id: rule.id,
        name: rule.name,
        isActive: rule.isActive,
        triggerType: rule.triggerType,
        conditions: rule.conditions,
        actions: rule.actions,
        createdAt: rule.createdAt.toISOString(),
      },
    },
  });
}
