import type { PrismaClient } from "@prisma/client";

export async function listBudgets(prisma: PrismaClient, householdId: string) {
  return prisma.budget.findMany({
    where: { householdId },
    include: { category: true },
    orderBy: { category: { name: "asc" } },
  });
}
