import type { PrismaClient } from "@prisma/client";

export async function listCategories(prisma: PrismaClient, householdId: string) {
  return prisma.category.findMany({
    where: { householdId },
    orderBy: { name: "asc" },
  });
}
