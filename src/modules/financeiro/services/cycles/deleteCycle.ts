import type { PrismaClient } from "@prisma/client";

export async function deleteCycle(
  prisma: PrismaClient,
  cycleId: string,
  householdId: string
) {
  const deleted = await prisma.cycle.deleteMany({
    where: { id: cycleId, householdId },
  });
  return deleted.count > 0;
}
