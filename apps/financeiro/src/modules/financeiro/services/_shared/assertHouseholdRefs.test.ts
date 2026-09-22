import { describe, it, expect } from "vitest";
import {
  assertHouseholdRefs,
  HOUSEHOLD_REF_NOT_FOUND,
} from "@/modules/financeiro/services/_shared/assertHouseholdRefs";
import { createHouseholdRefPrisma } from "@/modules/financeiro/__tests__/helpers/tenantScopedPrisma";

const HOUSE_A = "house-a";
const HOUSE_B = "house-b";

const seed = {
  sources: [
    { id: "source-a", householdId: HOUSE_A },
    { id: "source-a2", householdId: HOUSE_A },
    { id: "source-b", householdId: HOUSE_B },
  ],
  accounts: [
    { id: "account-a", householdId: HOUSE_A },
    { id: "account-b", householdId: HOUSE_B },
  ],
  categories: [
    { id: "cat-a", householdId: HOUSE_A },
    { id: "cat-b", householdId: HOUSE_B },
  ],
  cycles: [
    { id: "cycle-a", householdId: HOUSE_A },
    { id: "cycle-b", householdId: HOUSE_B },
  ],
  participants: [
    { id: "part-a1", accountId: "account-a", householdId: HOUSE_A },
    { id: "part-a2", accountId: "account-a2", householdId: HOUSE_A },
    { id: "part-b1", accountId: "account-b", householdId: HOUSE_B },
  ],
};

describe("assertHouseholdRefs", () => {
  it("aceita IDs do mesmo household", async () => {
    const prisma = createHouseholdRefPrisma(seed) as any;
    const result = await assertHouseholdRefs(prisma, HOUSE_A, {
      sourceIds: ["source-a"],
      accountId: "account-a",
      categoryId: "cat-a",
      cycleId: "cycle-a",
      paidByParticipantId: "part-a1",
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejeita ID inexistente com o mesmo código genérico", async () => {
    const prisma = createHouseholdRefPrisma(seed) as any;
    const result = await assertHouseholdRefs(prisma, HOUSE_A, { sourceIds: ["source-missing"] });
    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
  });

  it("rejeita ID de outro household com o mesmo código genérico", async () => {
    const prisma = createHouseholdRefPrisma(seed) as any;
    const missing = await assertHouseholdRefs(prisma, HOUSE_A, { sourceIds: ["source-missing"] });
    const foreign = await assertHouseholdRefs(prisma, HOUSE_A, { sourceIds: ["source-b"] });
    expect(foreign).toEqual(missing);
    expect(foreign).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
  });

  it("aceita múltiplos sourceIds válidos do mesmo household", async () => {
    const prisma = createHouseholdRefPrisma(seed) as any;
    const result = await assertHouseholdRefs(prisma, HOUSE_A, {
      sourceIds: ["source-a", "source-a2"],
    });
    expect(result).toEqual({ ok: true });
    expect(prisma.source.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          householdId: HOUSE_A,
          id: { in: ["source-a", "source-a2"] },
        }),
      })
    );
  });

  it("rejeita mistura de source válida + source de outro tenant", async () => {
    const prisma = createHouseholdRefPrisma(seed) as any;
    const result = await assertHouseholdRefs(prisma, HOUSE_A, {
      sourceIds: ["source-a", "source-b"],
    });
    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
  });

  it("deduplica IDs repetidos e aceita se o único id pertence ao household", async () => {
    const prisma = createHouseholdRefPrisma(seed) as any;
    const result = await assertHouseholdRefs(prisma, HOUSE_A, {
      sourceIds: ["source-a", "source-a"],
    });
    expect(result).toEqual({ ok: true });
    expect(prisma.source.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ["source-a"] } }),
      })
    );
  });

  it("ignora refs null/undefined/vazias", async () => {
    const prisma = createHouseholdRefPrisma(seed) as any;
    const result = await assertHouseholdRefs(prisma, HOUSE_A, {
      sourceIds: [null, undefined, ""],
      accountId: null,
      categoryId: undefined,
      cycleId: null,
      paidByParticipantId: null,
    });
    expect(result).toEqual({ ok: true });
    expect(prisma.source.findMany).not.toHaveBeenCalled();
    expect(prisma.account.findMany).not.toHaveBeenCalled();
  });

  it("rejeita participante de outra conta do mesmo household", async () => {
    const prisma = createHouseholdRefPrisma(seed) as any;
    const result = await assertHouseholdRefs(prisma, HOUSE_A, {
      accountId: "account-a",
      paidByParticipantId: "part-a2",
    });
    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
  });

  it("rejeita participante sem accountId", async () => {
    const prisma = createHouseholdRefPrisma(seed) as any;
    const result = await assertHouseholdRefs(prisma, HOUSE_A, {
      paidByParticipantId: "part-a1",
    });
    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.accountParticipant.findFirst).not.toHaveBeenCalled();
  });

  it("consulta sources, account, category, cycle e participant em paralelo", async () => {
    const prisma = createHouseholdRefPrisma(seed) as any;
    await assertHouseholdRefs(prisma, HOUSE_A, {
      sourceIds: ["source-a"],
      accountId: "account-a",
      categoryId: "cat-a",
      cycleId: "cycle-a",
      paidByParticipantId: "part-a1",
    });
    expect(prisma.source.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.account.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.category.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.cycle.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.accountParticipant.findFirst).toHaveBeenCalledTimes(1);
  });
});
