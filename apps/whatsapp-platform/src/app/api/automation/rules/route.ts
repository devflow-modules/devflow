import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { recordPlatformAudit } from "@/lib/platformAuditLog";
import { getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { normalizeTriggerType } from "@/modules/automation/triggerNormalize";
import { requireFeatureOr403 } from "@/modules/billing/featureGate";
import { ruleRequiresAdvancedAutomation } from "@/modules/automation/automationRuleFeatures";

export const dynamic = "force-dynamic";

const CANONICAL_TRIGGERS = [
  "MESSAGE_INBOUND",
  "MESSAGE_OUTBOUND",
  "CONVERSATION_CREATED",
  "STATUS_CHANGED",
  "TAG_ADDED",
  "TAG_REMOVED",
  "TIME_ELAPSED",
] as const;

const CONDITION_OPERATORS = [
  "contains",
  "equals",
  "notEquals",
  "exists",
  "isNull",
  "timeSinceLastMessage_gt",
  "gte",
  "lte",
  "gt",
  "lt",
] as const;

const ACTION_TYPES = [
  "assignConversation",
  "assign_to_user",
  "updateStatus",
  "addTag",
  "add_tag",
  "removeTag",
  "setPriority",
  "sendMessage",
  "send_message",
  "triggerAIResponse",
  "logAction",
  "notify",
] as const;

const conditionSchema = z.object({
  field: z.string(),
  operator: z.enum(CONDITION_OPERATORS),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
});

const actionSchema = z.object({
  type: z.enum(ACTION_TYPES),
  params: z.record(z.unknown()).optional(),
});

const createRuleSchema = z.object({
  name: z.string().min(1).max(200),
  triggerType: z
    .string()
    .min(1)
    .transform((s) => normalizeTriggerType(s))
    .refine(
      (t): t is (typeof CANONICAL_TRIGGERS)[number] =>
        (CANONICAL_TRIGGERS as readonly string[]).includes(t),
      { message: "Trigger inválido (use message_received → MESSAGE_INBOUND, time_elapsed → TIME_ELAPSED, etc.)" }
    ),
  conditions: z.array(conditionSchema).default([]),
  actions: z.array(actionSchema).min(1),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const tenantId = auth.payload.tenantId;
  if (!tenantId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const gate = await requireFeatureOr403(tenantId, "AUTOMATION");
  if (gate) return gate;

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
        isSystem: r.isSystem,
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

  if (
    ruleRequiresAdvancedAutomation({
      triggerType: parsed.data.triggerType,
      conditions: parsed.data.conditions,
      actions: parsed.data.actions,
    })
  ) {
    const gateAdv = await requireFeatureOr403(tenantId, "ADVANCED_AUTOMATION");
    if (gateAdv) return gateAdv;
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
