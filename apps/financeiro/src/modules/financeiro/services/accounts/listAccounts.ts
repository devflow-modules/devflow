import type { PrismaClient } from "@prisma/client";

export async function listAccounts(prisma: PrismaClient, householdId: string) {
  return prisma.account.findMany({
    where: { householdId },
    orderBy: { name: "asc" },
    include: {
      participants: { orderBy: { sortOrder: "asc" } },
      _count: { select: { expenses: true } },
    },
  });
}
