import type { PrismaClient } from "@prisma/client";
import {
  assertHouseholdRefs,
  type HouseholdRefDenied,
} from "@/modules/financeiro/services/_shared/assertHouseholdRefs";

export type CreateBudgetInput = {
  categoryId: string;
  monthlyLimit: number;
};

export async function createBudget(
  prisma: PrismaClient,
  householdId: string,
  data: CreateBudgetInput
): Promise<HouseholdRefDenied | Awaited<ReturnType<PrismaClient["budget"]["upsert"]>>> {
  const categoryCheck = await assertHouseholdRefs(prisma, householdId, {
    categoryId: data.categoryId,
  });
  if (!categoryCheck.ok) return categoryCheck;

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
