import type { PrismaClient } from "@prisma/client";

export type UpsertPersonalAllocationGoalInput = {
  year: number;
  month: number;
  investmentPercent?: number | null;
  savingsPercent?: number | null;
  investmentAmount?: number | null;
  savingsAmount?: number | null;
  observations?: string | null;
};

export async function upsertPersonalAllocationGoal(
  prisma: PrismaClient,
  userId: string,
  householdId: string,
  data: UpsertPersonalAllocationGoalInput
) {
  return prisma.personalAllocationGoal.upsert({
    where: {
      userId_householdId_year_month: {
        userId,
        householdId,
        year: data.year,
        month: data.month,
      },
    },
    create: {
      userId,
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
}
