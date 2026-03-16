import type { PrismaClient } from "@prisma/client";

export async function updateBudget(
  prisma: PrismaClient,
  budgetId: string,
  householdId: string,
  monthlyLimit: number
) {
  const result = await prisma.budget.updateMany({
    where: { id: budgetId, householdId },
    data: { monthlyLimit },
  });
  if (result.count === 0) return null;
  return prisma.budget.findUnique({
    where: { id: budgetId },
    include: { category: true },
  });
}
