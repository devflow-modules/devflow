import type { PrismaClient } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";

export type AuditContext = { userId: string; householdId: string };

export async function deleteIncomeAllocationGoal(
  prisma: PrismaClient,
  goalId: string,
  householdId: string,
  auditContext: AuditContext
) {
  const deleted = await prisma.incomeAllocationGoal.deleteMany({
    where: { id: goalId, householdId },
  });
  if (deleted.count === 0) return false;

  await createAuditLog(prisma, {
    userId: auditContext.userId,
    householdId: auditContext.householdId,
    action: "INCOME_ALLOCATION_GOAL_DELETED",
    entityType: "INCOME_ALLOCATION_GOAL",
    entityId: goalId,
  });

  return true;
}
