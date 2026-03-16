import type { PrismaClient } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";

export type UpdateIncomeAllocationGoalInput = {
  investmentPercent?: number | null;
  savingsPercent?: number | null;
  investmentAmount?: number | null;
  savingsAmount?: number | null;
  observations?: string | null;
};

export type AuditContext = { userId: string; householdId: string };

export async function updateIncomeAllocationGoal(
  prisma: PrismaClient,
  goalId: string,
  householdId: string,
  data: UpdateIncomeAllocationGoalInput,
  auditContext: AuditContext
) {
  const existing = await prisma.incomeAllocationGoal.findFirst({
    where: { id: goalId, householdId },
  });
  if (!existing) return null;

  const updated = await prisma.incomeAllocationGoal.update({
    where: { id: goalId },
    data,
  });

  await createAuditLog(prisma, {
    userId: auditContext.userId,
    householdId: auditContext.householdId,
    action: "INCOME_ALLOCATION_GOAL_UPDATED",
    entityType: "INCOME_ALLOCATION_GOAL",
    entityId: updated.id,
  });

  return updated;
}
