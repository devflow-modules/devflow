import { describe, it, expect, vi } from "vitest";
import { updateIncome } from "@/modules/financeiro/services/incomes/updateIncome";
import { HOUSEHOLD_REF_NOT_FOUND } from "@/modules/financeiro/services/_shared/assertHouseholdRefs";
import { createHouseholdRefPrisma } from "@/modules/financeiro/__tests__/helpers/tenantScopedPrisma";

const HOUSE_A = "house-a";
const HOUSE_B = "house-b";

function prismaForUpdate() {
  const refs = createHouseholdRefPrisma({
    sources: [
      { id: "source-a", householdId: HOUSE_A },
      { id: "source-b", householdId: HOUSE_B },
    ],
  });
  return {
    ...refs,
    income: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue({
        id: "inc-1",
        householdId: HOUSE_A,
        amount: 1500,
        sourceId: "source-a",
      }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  } as any;
}

describe("updateIncome tenant isolation", () => {
  it("aceita sourceId da mesma casa", async () => {
    const prisma = prismaForUpdate();
    const result = await updateIncome(
      prisma,
      "inc-1",
      HOUSE_A,
      { sourceId: "source-a" },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toMatchObject({ id: "inc-1" });
    expect(prisma.income.updateMany).toHaveBeenCalledTimes(1);
  });

  it("rejeita sourceId cross-tenant sem write", async () => {
    const prisma = prismaForUpdate();
    const result = await updateIncome(
      prisma,
      "inc-1",
      HOUSE_A,
      { sourceId: "source-b" },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.income.updateMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejeita source inexistente com a mesma falha", async () => {
    const prisma = prismaForUpdate();
    const missing = await updateIncome(
      prisma,
      "inc-1",
      HOUSE_A,
      { sourceId: "source-missing" },
      { userId: "u1", householdId: HOUSE_A }
    );
    const foreign = await updateIncome(
      prisma,
      "inc-1",
      HOUSE_A,
      { sourceId: "source-b" },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(missing).toEqual(foreign);
    expect(missing).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.income.updateMany).not.toHaveBeenCalled();
  });

  it("permite remover sourceId com null sem lookup", async () => {
    const prisma = prismaForUpdate();
    const result = await updateIncome(
      prisma,
      "inc-1",
      HOUSE_A,
      { sourceId: null },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toMatchObject({ id: "inc-1" });
    expect(prisma.source.findMany).not.toHaveBeenCalled();
    expect(prisma.income.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sourceId: null }),
      })
    );
  });

  it("não consulta Source quando sourceId está ausente", async () => {
    const prisma = prismaForUpdate();
    await updateIncome(
      prisma,
      "inc-1",
      HOUSE_A,
      { amount: 99 },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(prisma.source.findMany).not.toHaveBeenCalled();
    expect(prisma.income.updateMany).toHaveBeenCalledTimes(1);
  });
});
