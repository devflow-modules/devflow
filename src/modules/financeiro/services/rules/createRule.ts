import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { trackFirstRuleCreated } from "@/analytics/growth";
import { trackFeatureUsage, trackFunnelFirst } from "@/modules/financeiro/adapters/productAnalytics";
import { emit } from "@/modules/financeiro/events";

export type CreateRuleInput = {
  name: string;
  description?: string | null;
  ruleType: string;
  percentage?: number | null;
  fixedAmount?: number | null;
  referenceCategory?: string | null;
  sourceIds: string[];
};

export type AuditContext = {
  userId: string;
  householdId: string;
};

export async function createRule(
  prisma: PrismaClient,
  householdId: string,
  data: CreateRuleInput,
  auditContext: AuditContext
) {
  const { sourceIds, ...rulePayload } = data;
  const rule = await prisma.rule.create({
    data: {
      ...rulePayload,
      householdId,
      ruleSources: {
        create: sourceIds.map((sourceId) => ({ source: { connect: { id: sourceId } } })),
      },
    } as Parameters<PrismaClient["rule"]["create"]>[0]["data"],
    include: {
      ruleSources: {
        include: { source: true },
      },
    },
  });

  await createAuditLog(prisma, {
    userId: auditContext.userId,
    householdId: auditContext.householdId,
    action: AUDIT_ACTIONS.RULE_CREATED,
    entityType: AUDIT_ENTITY.RULE,
    entityId: rule.id,
    metadata: { name: rule.name, ruleType: rule.ruleType },
  });

  emit("finance.rule.created", {
    householdId,
    userId: auditContext.userId,
    entityId: rule.id,
    timestamp: new Date().toISOString(),
  });

  const analyticsContext = { userId: auditContext.userId, householdId };
  trackFeatureUsage("rules.create", analyticsContext);
  if (trackFunnelFirst("finance.funnel.first_rule_created", analyticsContext)) {
    trackFirstRuleCreated(analyticsContext);
  }

  return rule;
}
