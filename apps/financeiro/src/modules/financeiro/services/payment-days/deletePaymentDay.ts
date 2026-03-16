import type { PrismaClient } from "@prisma/client";

export async function deletePaymentDay(
  prisma: PrismaClient,
  paymentDayId: string,
  householdId: string
) {
  const deleted = await prisma.paymentDay.deleteMany({
    where: { id: paymentDayId, source: { householdId } },
  });
  return deleted.count > 0;
}
