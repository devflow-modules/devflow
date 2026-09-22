import { describe, it, expect, vi } from "vitest";
import { createBudget } from "@/modules/financeiro/services/budgets/createBudget";
import { HOUSEHOLD_REF_NOT_FOUND } from "@/modules/financeiro/services/_shared/assertHouseholdRefs";
import { createHouseholdRefPrisma } from "@/modules/financeiro/__tests__/helpers/tenantScopedPrisma";

const HOUSE_A = "house-a";

function prismaForBudget() {
  const refs = createHouseholdRefPrisma({
    categories: [
      { id: "cat-a", householdId: HOUSE_A },
      { id: "cat-b", householdId: "house-b" },
    ],
  });
  return {
    ...refs,
    budget: {
      upsert: vi.fn().mockResolvedValue({
        id: "budget-1",
        householdId: HOUSE_A,
        categoryId: "cat-a",
        monthlyLimit: 500,
      }),
    },
  } as any;
}

describe("createBudget tenant isolation", () => {
  it("aceita categoryId da mesma casa", async () => {
    const prisma = prismaForBudget();
    const result = await createBudget(prisma, HOUSE_A, { categoryId: "cat-a", monthlyLimit: 500 });

    expect(result).toMatchObject({ id: "budget-1" });
    expect(prisma.budget.upsert).toHaveBeenCalledTimes(1);
  });

  it("rejeita categoryId de outro household sem upsert", async () => {
    const prisma = prismaForBudget();
    const result = await createBudget(prisma, HOUSE_A, { categoryId: "cat-b", monthlyLimit: 500 });

    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.budget.upsert).not.toHaveBeenCalled();
  });

  it("rejeita categoryId inexistente com o mesmo código genérico", async () => {
    const prisma = prismaForBudget();
    const missing = await createBudget(prisma, HOUSE_A, {
      categoryId: "cat-missing",
      monthlyLimit: 500,
    });
    const foreign = await createBudget(prisma, HOUSE_A, { categoryId: "cat-b", monthlyLimit: 500 });

    expect(missing).toEqual(foreign);
    expect(missing).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.budget.upsert).not.toHaveBeenCalled();
  });
});
