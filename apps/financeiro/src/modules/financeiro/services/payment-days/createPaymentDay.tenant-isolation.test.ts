import { describe, it, expect, vi } from "vitest";
import { createPaymentDay } from "@/modules/financeiro/services/payment-days/createPaymentDay";
import { HOUSEHOLD_REF_NOT_FOUND } from "@/modules/financeiro/services/_shared/assertHouseholdRefs";
import { createHouseholdRefPrisma } from "@/modules/financeiro/__tests__/helpers/tenantScopedPrisma";

const HOUSE_A = "house-a";

function prismaForCreate() {
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
      create: vi.fn().mockResolvedValue({ id: "pd-1", sourceId: "source-a" }),
    },
  } as any;
}

describe("createPaymentDay tenant isolation", () => {
  it("aceita sourceId e cycleId da mesma casa", async () => {
    const prisma = prismaForCreate();
    const result = await createPaymentDay(prisma, HOUSE_A, {
      dayOfMonth: 5,
      sourceId: "source-a",
      cycleId: "cycle-a",
    });

    expect(result).toMatchObject({ data: { id: "pd-1" } });
    expect(prisma.paymentDay.create).toHaveBeenCalledTimes(1);
  });

  it("rejeita sourceId estrangeira sem create", async () => {
    const prisma = prismaForCreate();
    const result = await createPaymentDay(prisma, HOUSE_A, {
      dayOfMonth: 5,
      sourceId: "source-b",
    });

    expect(result).toEqual({ error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.paymentDay.create).not.toHaveBeenCalled();
  });

  it("rejeita cycleId estrangeiro sem create", async () => {
    const prisma = prismaForCreate();
    const result = await createPaymentDay(prisma, HOUSE_A, {
      dayOfMonth: 5,
      sourceId: "source-a",
      cycleId: "cycle-b",
    });

    expect(result).toEqual({ error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.paymentDay.create).not.toHaveBeenCalled();
  });
});
