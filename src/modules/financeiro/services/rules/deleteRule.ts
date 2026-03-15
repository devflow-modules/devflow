import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";

export type AuditContext = {
  userId: string;
  householdId: string;
};

export async function deleteRule(
  prisma: PrismaClient,
  ruleId: string,
  householdId: string,
  auditContext: AuditContext
) {
  const deleted = await prisma.rule.deleteMany({ where: { id: ruleId, householdId } });
  if (deleted.count === 0) return false;

  await createAuditLog(prisma, {
    userId: auditContext.userId,
    householdId: auditContext.householdId,
    action: AUDIT_ACTIONS.RULE_DELETED,
    entityType: AUDIT_ENTITY.RULE,
    entityId: ruleId,
  });

  return true;
}
