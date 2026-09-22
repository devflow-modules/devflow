import { describe, it, expect, vi } from "vitest";
import { updateRule } from "@/modules/financeiro/services/rules/updateRule";
import { HOUSEHOLD_REF_NOT_FOUND } from "@/modules/financeiro/services/_shared/assertHouseholdRefs";
import { createHouseholdRefPrisma } from "@/modules/financeiro/__tests__/helpers/tenantScopedPrisma";

const HOUSE_A = "house-a";

function prismaForUpdate() {
  const refs = createHouseholdRefPrisma({
    sources: [
      { id: "source-a", householdId: HOUSE_A },
      { id: "source-b", householdId: "house-b" },
    ],
  });
  return {
    ...refs,
    rule: {
      findFirst: vi.fn().mockResolvedValue({ id: "rule-1", householdId: HOUSE_A }),
      update: vi.fn().mockResolvedValue({
        id: "rule-1",
        name: "Atualizada",
        ruleType: "CATEGORY_PERCENTAGE",
        ruleSources: [],
      }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  } as any;
}

describe("updateRule tenant isolation", () => {
  it("aceita sourceIds do mesmo household", async () => {
    const prisma = prismaForUpdate();
    const result = await updateRule(
      prisma,
      "rule-1",
      HOUSE_A,
      { sourceIds: ["source-a"] },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toMatchObject({ id: "rule-1" });
    expect(prisma.rule.update).toHaveBeenCalledTimes(1);
  });

  it("rejeita source estrangeira sem apagar relações nem chamar update", async () => {
    const prisma = prismaForUpdate();
    const result = await updateRule(
      prisma,
      "rule-1",
      HOUSE_A,
      { sourceIds: ["source-b"] },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.rule.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejeita mistura local + estrangeira sem mutação parcial", async () => {
    const prisma = prismaForUpdate();
    const result = await updateRule(
      prisma,
      "rule-1",
      HOUSE_A,
      { sourceIds: ["source-a", "source-b"] },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.rule.update).not.toHaveBeenCalled();
  });

  it("não valida sources quando sourceIds está ausente", async () => {
    const prisma = prismaForUpdate();
    await updateRule(
      prisma,
      "rule-1",
      HOUSE_A,
      { name: "Só o nome" },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(prisma.source.findMany).not.toHaveBeenCalled();
    expect(prisma.rule.update).toHaveBeenCalledTimes(1);
  });
});
