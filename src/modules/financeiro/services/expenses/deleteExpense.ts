import type { PrismaClient } from "@prisma/client";
import { AUDIT_ACTIONS, AUDIT_ENTITY, createAuditLog } from "@/lib/audit";
import { emit } from "@/modules/financeiro/events";

export type AuditContext = {
  userId: string;
  householdId: string;
};

export async function deleteExpense(
  prisma: PrismaClient,
  expenseId: string,
  householdId: string,
  auditContext: AuditContext
): Promise<boolean> {
  const deleted = await prisma.expense.deleteMany({
    where: { id: expenseId, householdId },
  });

  if (deleted.count === 0) return false;

  await createAuditLog(prisma, {
    userId: auditContext.userId,
    householdId: auditContext.householdId,
    action: AUDIT_ACTIONS.EXPENSE_DELETED,
    entityType: AUDIT_ENTITY.EXPENSE,
    entityId: expenseId,
  });

  emit("finance.expense.deleted", {
    householdId,
    userId: auditContext.userId,
    entityId: expenseId,
    timestamp: new Date().toISOString(),
  });

  return true;
}
