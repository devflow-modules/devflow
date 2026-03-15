import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";

export type AuditContext = {
  userId: string;
  householdId: string;
};

export async function deleteIncome(
  prisma: PrismaClient,
  incomeId: string,
  householdId: string,
  auditContext: AuditContext
): Promise<boolean> {
  const deleted = await prisma.income.deleteMany({
    where: { id: incomeId, householdId },
  });

  if (deleted.count === 0) return false;

  await createAuditLog(prisma, {
    userId: auditContext.userId,
    householdId: auditContext.householdId,
    action: AUDIT_ACTIONS.INCOME_DELETED,
    entityType: AUDIT_ENTITY.INCOME,
    entityId: incomeId,
  });

  return true;
}
