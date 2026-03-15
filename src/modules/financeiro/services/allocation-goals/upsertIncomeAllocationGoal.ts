import type { PrismaClient } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";

export type UpsertIncomeAllocationGoalInput = {
  year: number;
  month: number;
  investmentPercent?: number | null;
  savingsPercent?: number | null;
  investmentAmount?: number | null;
  savingsAmount?: number | null;
  observations?: string | null;
};

export type AuditContext = { userId: string; householdId: string };

export async function upsertIncomeAllocationGoal(
  prisma: PrismaClient,
  householdId: string,
  data: UpsertIncomeAllocationGoalInput,
  auditContext: AuditContext
) {
  const goal = await prisma.incomeAllocationGoal.upsert({
    where: {
      householdId_year_month: { householdId, year: data.year, month: data.month },
    },
    create: {
      householdId,
      year: data.year,
      month: data.month,
      investmentPercent: data.investmentPercent,
      savingsPercent: data.savingsPercent,
      investmentAmount: data.investmentAmount,
      savingsAmount: data.savingsAmount,
      observations: data.observations,
    },
    update: {
      investmentPercent: data.investmentPercent,
      savingsPercent: data.savingsPercent,
      investmentAmount: data.investmentAmount,
      savingsAmount: data.savingsAmount,
      observations: data.observations,
    },
  });

  await createAuditLog(prisma, {
    userId: auditContext.userId,
    householdId: auditContext.householdId,
    action: "INCOME_ALLOCATION_GOAL_UPSERTED",
    entityType: "INCOME_ALLOCATION_GOAL",
    entityId: goal.id,
    metadata: { year: goal.year, month: goal.month },
  });

  return goal;
}
