import type { PrismaClient } from "@prisma/client";
import { trackFunnelFirst, trackToolUsage } from "@/modules/financeiro/adapters/productAnalytics";

export type CreateCycleInput = {
  name: string;
  cycleType: "MONTHLY" | "WEEKLY";
  anchorDay?: number | null;
  anchorWeekDay?: number | null;
};

export async function createCycle(
  prisma: PrismaClient,
  householdId: string,
  data: CreateCycleInput
) {
  const result = await prisma.cycle.create({
    data: {
      householdId,
      name: data.name,
      cycleType: data.cycleType,
      anchorDay: data.anchorDay ?? null,
      anchorWeekDay: data.anchorWeekDay ?? null,
    },
  });

  trackToolUsage("cycles", { householdId });
  trackFunnelFirst("finance.funnel.first_cycle_configured", { householdId });

  return result;
}
