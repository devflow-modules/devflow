import type { PrismaClient } from "@prisma/client";

export type UpdatePaymentDayInput = {
  dayOfMonth?: number;
  description?: string | null;
  sourceId?: string;
  cycleId?: string | null;
};

export async function updatePaymentDay(
  prisma: PrismaClient,
  paymentDayId: string,
  householdId: string,
  data: UpdatePaymentDayInput
) {
  if (data.cycleId != null && data.cycleId !== "") {
    const cycle = await prisma.cycle.findFirst({
      where: { id: data.cycleId, householdId },
    });
    if (!cycle) return { error: "CYCLE_NOT_FOUND" as const };
  }

  const updated = await prisma.paymentDay.updateMany({
    where: { id: paymentDayId, source: { householdId } },
    data,
  });
  if (updated.count === 0) return { error: "NOT_FOUND" as const };

  const day = await prisma.paymentDay.findUnique({ where: { id: paymentDayId } });
  return { data: day };
}
