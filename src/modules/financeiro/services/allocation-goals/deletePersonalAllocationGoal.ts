import type { PrismaClient } from "@prisma/client";

export async function deletePersonalAllocationGoal(
  prisma: PrismaClient,
  goalId: string,
  userId: string,
  householdId: string
) {
  const deleted = await prisma.personalAllocationGoal.deleteMany({
    where: { id: goalId, userId, householdId },
  });
  return deleted.count > 0;
}
