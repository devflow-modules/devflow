import type { PrismaClient } from "@prisma/client";

export async function getIncomeAllocationGoal(
  prisma: PrismaClient,
  householdId: string,
  year: number,
  month: number
) {
  return prisma.incomeAllocationGoal.findUnique({
    where: { householdId_year_month: { householdId, year, month } },
  });
}
