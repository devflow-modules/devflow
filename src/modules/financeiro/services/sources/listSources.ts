import type { PrismaClient } from "@prisma/client";

export async function listSources(prisma: PrismaClient, householdId: string) {
  return prisma.source.findMany({
    where: { householdId },
    orderBy: { createdAt: "desc" },
    include: {
      paymentDays: { include: { cycle: true } },
    },
  });
}
