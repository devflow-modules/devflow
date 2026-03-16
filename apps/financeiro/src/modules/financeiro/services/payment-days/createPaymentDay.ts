import type { PrismaClient } from "@prisma/client";

export type CreatePaymentDayInput = {
  dayOfMonth: number;
  description?: string | null;
  sourceId: string;
  cycleId?: string | null;
};

export async function createPaymentDay(
  prisma: PrismaClient,
  householdId: string,
  data: CreatePaymentDayInput
) {
  const source = await prisma.source.findFirst({
    where: { id: data.sourceId, householdId },
  });
  if (!source) return { error: "SOURCE_NOT_FOUND" as const };

  if (data.cycleId) {
    const cycle = await prisma.cycle.findFirst({
      where: { id: data.cycleId, householdId },
    });
    if (!cycle) return { error: "CYCLE_NOT_FOUND" as const };
  }

  const { sourceId, cycleId, ...dayPayload } = data;
  const day = await prisma.paymentDay.create({
    data: {
      ...dayPayload,
      source: { connect: { id: sourceId } },
      ...(cycleId ? { cycle: { connect: { id: cycleId } } } : {}),
    },
  });
  return { data: day };
}
