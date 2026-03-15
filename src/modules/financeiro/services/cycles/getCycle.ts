import type { PrismaClient } from "@prisma/client";

export async function getCycle(prisma: PrismaClient, cycleId: string, householdId: string) {
  return prisma.cycle.findFirst({
    where: { id: cycleId, householdId },
  });
}
