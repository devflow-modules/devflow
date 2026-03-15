import type { PrismaClient } from "@prisma/client";

export async function listRules(prisma: PrismaClient, householdId: string) {
  return prisma.rule.findMany({
    where: { householdId },
    include: {
      ruleSources: {
        include: { source: true },
      },
    },
  });
}
