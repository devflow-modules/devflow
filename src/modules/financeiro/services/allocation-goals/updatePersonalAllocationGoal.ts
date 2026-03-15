import type { PrismaClient } from "@prisma/client";

export type UpdatePersonalAllocationGoalInput = {
  investmentPercent?: number | null;
  savingsPercent?: number | null;
  investmentAmount?: number | null;
  savingsAmount?: number | null;
  observations?: string | null;
};

export async function updatePersonalAllocationGoal(
  prisma: PrismaClient,
  goalId: string,
  userId: string,
  householdId: string,
  data: UpdatePersonalAllocationGoalInput
) {
  const existing = await prisma.personalAllocationGoal.findFirst({
    where: { id: goalId, userId, householdId },
  });
  if (!existing) return null;

  return prisma.personalAllocationGoal.update({
    where: { id: goalId },
    data,
  });
}
