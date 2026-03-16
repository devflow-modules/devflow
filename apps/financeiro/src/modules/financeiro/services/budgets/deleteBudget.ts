import type { PrismaClient } from "@prisma/client";

export async function deleteBudget(
  prisma: PrismaClient,
  budgetId: string,
  householdId: string
) {
  const result = await prisma.budget.deleteMany({
    where: { id: budgetId, householdId },
  });
  return result.count > 0;
}
