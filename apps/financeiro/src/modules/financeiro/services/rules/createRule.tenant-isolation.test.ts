import { describe, it, expect, vi } from "vitest";
import { createRule } from "@/modules/financeiro/services/rules/createRule";
import { HOUSEHOLD_REF_NOT_FOUND } from "@/modules/financeiro/services/_shared/assertHouseholdRefs";
import { createHouseholdRefPrisma } from "@/modules/financeiro/__tests__/helpers/tenantScopedPrisma";

const HOUSE_A = "house-a";
const payload = {
  name: "Regra poupança",
  ruleType: "CATEGORY_PERCENTAGE",
  sourceIds: [] as string[],
};

function prismaForCreate() {
  const refs = createHouseholdRefPrisma({
    sources: [
      { id: "source-a", householdId: HOUSE_A },
      { id: "source-b", householdId: "house-b" },
    ],
  });
  return {
    ...refs,
    rule: { create: vi.fn().mockResolvedValue({ id: "rule-1", name: payload.name, ruleType: payload.ruleType }) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  } as any;
}

describe("createRule tenant isolation", () => {
  it("aceita sourceIds do mesmo household", async () => {
    const prisma = prismaForCreate();
    const result = await createRule(
      prisma,
      HOUSE_A,
      { ...payload, sourceIds: ["source-a"] },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toMatchObject({ id: "rule-1" });
    expect(prisma.rule.create).toHaveBeenCalledTimes(1);
  });

  it("rejeita source de outro household e não chama rule.create", async () => {
    const prisma = prismaForCreate();
    const result = await createRule(
      prisma,
      HOUSE_A,
      { ...payload, sourceIds: ["source-b"] },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.rule.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejeita a operação inteira quando um sourceIds é de outro tenant", async () => {
    const prisma = prismaForCreate();
    const result = await createRule(
      prisma,
      HOUSE_A,
      { ...payload, sourceIds: ["source-a", "source-b"] },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.rule.create).not.toHaveBeenCalled();
  });
});
