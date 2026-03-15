import type { PrismaClient } from "@prisma/client";

export async function getPersonalAllocationGoal(
  prisma: PrismaClient,
  userId: string,
  householdId: string,
  year: number,
  month: number
) {
  return prisma.personalAllocationGoal.findUnique({
    where: {
      userId_householdId_year_month: {
        userId,
        householdId,
        year,
        month,
      },
    },
  });
}
