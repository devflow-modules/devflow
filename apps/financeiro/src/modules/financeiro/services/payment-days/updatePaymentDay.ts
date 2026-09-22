import type { PrismaClient } from "@prisma/client";
import {
  assertHouseholdRefs,
  HOUSEHOLD_REF_NOT_FOUND,
} from "@/modules/financeiro/services/_shared/assertHouseholdRefs";

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
  const hasSource = Boolean(data.sourceId);
  const hasCycle = data.cycleId != null && data.cycleId !== "";
  if (hasSource || hasCycle) {
    const refs = await assertHouseholdRefs(prisma, householdId, {
      sourceIds: data.sourceId ? [data.sourceId] : undefined,
      cycleId: hasCycle ? data.cycleId : undefined,
    });
    if (!refs.ok) return { error: HOUSEHOLD_REF_NOT_FOUND };
  }

  const updated = await prisma.paymentDay.updateMany({
    where: { id: paymentDayId, source: { householdId } },
    data,
  });
  if (updated.count === 0) return { error: "NOT_FOUND" as const };

  const day = await prisma.paymentDay.findUnique({ where: { id: paymentDayId } });
  return { data: day };
}
