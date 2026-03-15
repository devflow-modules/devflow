import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { trackFeatureUsage } from "@/modules/financeiro/adapters/productAnalytics";
import { emit } from "@/modules/financeiro/events";

export type UpdateRuleInput = {
  name?: string;
  description?: string | null;
  ruleType?: string;
  percentage?: number | null;
  fixedAmount?: number | null;
  referenceCategory?: string | null;
  sourceIds?: string[];
};

export type AuditContext = {
  userId: string;
  householdId: string;
};

export async function updateRule(
  prisma: PrismaClient,
  ruleId: string,
  householdId: string,
  data: UpdateRuleInput,
  auditContext: AuditContext
) {
  const existingRule = await prisma.rule.findFirst({
    where: { id: ruleId, householdId },
  });
  if (!existingRule) return null;

  const payload: Record<string, unknown> = { ...data };
  if (payload.sourceIds) {
    (payload as { ruleSources: { deleteMany: object; create: { source: { connect: { id: string } } }[] } }).ruleSources = {
      deleteMany: {},
      create: (data.sourceIds as string[]).map((sourceId: string) => ({
        source: { connect: { id: sourceId } },
      })),
    };
    delete payload.sourceIds;
  }

  const updated = await prisma.rule.update({
    where: { id: ruleId },
    data: payload as Parameters<PrismaClient["rule"]["update"]>[0]["data"],
    include: { ruleSources: { include: { source: true } } },
  });

  await createAuditLog(prisma, {
    userId: auditContext.userId,
    householdId: auditContext.householdId,
    action: AUDIT_ACTIONS.RULE_UPDATED,
    entityType: AUDIT_ENTITY.RULE,
    entityId: updated.id,
    metadata: { name: updated.name, ruleType: updated.ruleType },
  });

  emit("finance.rule.updated", {
    householdId,
    userId: auditContext.userId,
    entityId: updated.id,
    timestamp: new Date().toISOString(),
  });

  trackFeatureUsage("rules.update", { userId: auditContext.userId, householdId });

  return updated;
}
