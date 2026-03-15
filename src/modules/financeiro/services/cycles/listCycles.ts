import type { PrismaClient } from "@prisma/client";

export async function listCycles(prisma: PrismaClient, householdId: string) {
  return prisma.cycle.findMany({
    where: { householdId },
    orderBy: [{ cycleType: "asc" }, { name: "asc" }],
  });
}
