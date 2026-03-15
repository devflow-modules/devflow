import type { PrismaClient } from "@prisma/client";

export type UpdateCycleInput = {
  name?: string;
  cycleType?: "MONTHLY" | "WEEKLY";
  anchorDay?: number | null;
  anchorWeekDay?: number | null;
};

export async function updateCycle(
  prisma: PrismaClient,
  cycleId: string,
  householdId: string,
  data: UpdateCycleInput
) {
  const existing = await prisma.cycle.findFirst({
    where: { id: cycleId, householdId },
  });
  if (!existing) return null;

  return prisma.cycle.update({
    where: { id: cycleId },
    data: {
      ...(data.name != null && { name: data.name }),
      ...(data.cycleType != null && { cycleType: data.cycleType }),
      ...(data.anchorDay !== undefined && { anchorDay: data.anchorDay ?? null }),
      ...(data.anchorWeekDay !== undefined && { anchorWeekDay: data.anchorWeekDay ?? null }),
    },
  });
}
