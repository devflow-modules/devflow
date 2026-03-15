import type { PrismaClient } from "@prisma/client";

export async function listExpenses(prisma: PrismaClient, householdId: string) {
  return prisma.expense.findMany({
    where: { householdId },
    orderBy: { dueDate: "asc" },
    include: { source: true },
  });
}
