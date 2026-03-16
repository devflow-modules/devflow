import type { PrismaClient } from "@prisma/client";

export async function listPaymentDays(prisma: PrismaClient, householdId: string) {
  return prisma.paymentDay.findMany({
    where: {
      source: { householdId },
    },
    orderBy: { dayOfMonth: "asc" },
  });
}
