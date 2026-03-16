import type { PrismaClient } from "@prisma/client";

export type CreateBudgetInput = {
  categoryId: string;
  monthlyLimit: number;
};

export async function createBudget(
  prisma: PrismaClient,
  householdId: string,
  data: CreateBudgetInput
) {
  return prisma.budget.upsert({
    where: {
      householdId_categoryId: { householdId, categoryId: data.categoryId },
    },
    create: {
      householdId,
      categoryId: data.categoryId,
      monthlyLimit: data.monthlyLimit,
    },
    update: { monthlyLimit: data.monthlyLimit },
    include: { category: true },
  });
}
