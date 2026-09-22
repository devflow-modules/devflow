import type { PrismaClient } from "@prisma/client";
import {
  assertHouseholdRefs,
  HOUSEHOLD_REF_NOT_FOUND,
} from "@/modules/financeiro/services/_shared/assertHouseholdRefs";

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
  const refs = await assertHouseholdRefs(prisma, householdId, {
    sourceIds: [data.sourceId],
    cycleId: data.cycleId,
  });
  if (!refs.ok) return { error: HOUSEHOLD_REF_NOT_FOUND };

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
