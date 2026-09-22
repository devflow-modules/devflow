import { describe, it, expect, vi } from "vitest";
import { createIncome } from "@/modules/financeiro/services/incomes/createIncome";
import { HOUSEHOLD_REF_NOT_FOUND } from "@/modules/financeiro/services/_shared/assertHouseholdRefs";
import { createHouseholdRefPrisma } from "@/modules/financeiro/__tests__/helpers/tenantScopedPrisma";

const HOUSE_A = "house-a";
const HOUSE_B = "house-b";
const baseInput = { amount: 2000, receivedAt: "2026-03-15" };

function prismaForIncome() {
  const refs = createHouseholdRefPrisma({
    sources: [
      { id: "source-a", householdId: HOUSE_A },
      { id: "source-b", householdId: HOUSE_B },
    ],
  });
  return {
    ...refs,
    income: {
      create: vi.fn().mockResolvedValue({
        id: "inc-1",
        householdId: HOUSE_A,
        amount: 2000,
        sourceId: "source-a",
      }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  } as any;
}

describe("createIncome tenant isolation", () => {
  it("aceita sourceId do mesmo household", async () => {
    const prisma = prismaForIncome();
    const result = await createIncome(
      prisma,
      HOUSE_A,
      { ...baseInput, sourceId: "source-a" },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toMatchObject({ id: "inc-1" });
    expect(prisma.income.create).toHaveBeenCalledTimes(1);
    expect(prisma.source.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ householdId: HOUSE_A, id: { in: ["source-a"] } }),
      })
    );
  });

  it("rejeita sourceId de outro household sem chamar income.create", async () => {
    const prisma = prismaForIncome();
    const result = await createIncome(
      prisma,
      HOUSE_A,
      { ...baseInput, sourceId: "source-b" },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.income.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejeita source inexistente com a mesma resposta de source estrangeira", async () => {
    const prisma = prismaForIncome();
    const missing = await createIncome(
      prisma,
      HOUSE_A,
      { ...baseInput, sourceId: "source-missing" },
      { userId: "u1", householdId: HOUSE_A }
    );
    const foreign = await createIncome(
      prisma,
      HOUSE_A,
      { ...baseInput, sourceId: "source-b" },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(missing).toEqual(foreign);
    expect(missing).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.income.create).not.toHaveBeenCalled();
  });

  it("permite criar receita sem Source", async () => {
    const prisma = prismaForIncome();
    const result = await createIncome(prisma, HOUSE_A, baseInput, {
      userId: "u1",
      householdId: HOUSE_A,
    });

    expect(result).toMatchObject({ id: "inc-1" });
    expect(prisma.source.findMany).not.toHaveBeenCalled();
    expect(prisma.income.create).toHaveBeenCalledTimes(1);
  });
});
