import type { PrismaClient } from "@prisma/client";

export async function listIncomes(prisma: PrismaClient, householdId: string) {
  return prisma.income.findMany({
    where: { householdId },
    orderBy: { receivedAt: "desc" },
    include: { source: true },
  });
}
