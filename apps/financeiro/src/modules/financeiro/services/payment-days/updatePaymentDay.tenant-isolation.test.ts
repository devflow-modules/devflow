import { describe, it, expect, vi } from "vitest";
import { updatePaymentDay } from "@/modules/financeiro/services/payment-days/updatePaymentDay";
import { HOUSEHOLD_REF_NOT_FOUND } from "@/modules/financeiro/services/_shared/assertHouseholdRefs";
import { createHouseholdRefPrisma } from "@/modules/financeiro/__tests__/helpers/tenantScopedPrisma";

const HOUSE_A = "house-a";

function prismaForPaymentDay() {
  const refs = createHouseholdRefPrisma({
    sources: [
      { id: "source-a", householdId: HOUSE_A },
      { id: "source-b", householdId: "house-b" },
    ],
    cycles: [
      { id: "cycle-a", householdId: HOUSE_A },
      { id: "cycle-b", householdId: "house-b" },
    ],
  });
  return {
    ...refs,
    paymentDay: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue({ id: "pd-1", sourceId: "source-a" }),
    },
  } as any;
}

describe("updatePaymentDay tenant isolation", () => {
  it("aceita sourceId da mesma casa", async () => {
    const prisma = prismaForPaymentDay();
    const result = await updatePaymentDay(prisma, "pd-1", HOUSE_A, { sourceId: "source-a" });

    expect(result).toMatchObject({ data: { id: "pd-1" } });
    expect(prisma.paymentDay.updateMany).toHaveBeenCalledTimes(1);
  });

  it("rejeita sourceId estrangeira sem mutação", async () => {
    const prisma = prismaForPaymentDay();
    const result = await updatePaymentDay(prisma, "pd-1", HOUSE_A, { sourceId: "source-b" });

    expect(result).toEqual({ error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.paymentDay.updateMany).not.toHaveBeenCalled();
  });

  it("rejeita cycleId estrangeiro sem mutação", async () => {
    const prisma = prismaForPaymentDay();
    const result = await updatePaymentDay(prisma, "pd-1", HOUSE_A, { cycleId: "cycle-b" });

    expect(result).toEqual({ error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.paymentDay.updateMany).not.toHaveBeenCalled();
  });

  it("permite limpar cycleId sem lookup", async () => {
    const prisma = prismaForPaymentDay();
    const result = await updatePaymentDay(prisma, "pd-1", HOUSE_A, { cycleId: null });

    expect(result).toMatchObject({ data: { id: "pd-1" } });
    expect(prisma.cycle.findMany).not.toHaveBeenCalled();
    expect(prisma.paymentDay.updateMany).toHaveBeenCalledTimes(1);
  });
});
