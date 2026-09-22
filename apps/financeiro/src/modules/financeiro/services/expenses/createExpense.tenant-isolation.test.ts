import { describe, it, expect, vi } from "vitest";
import { createExpense } from "@/modules/financeiro/services/expenses/createExpense";
import { HOUSEHOLD_REF_NOT_FOUND } from "@/modules/financeiro/services/_shared/assertHouseholdRefs";
import { createHouseholdRefPrisma } from "@/modules/financeiro/__tests__/helpers/tenantScopedPrisma";

const HOUSE_A = "house-a";
const HOUSE_B = "house-b";
const baseInput = { category: "Alimentação", amount: 150, dueDate: "2025-03-15" };

function prismaForExpense() {
  const refs = createHouseholdRefPrisma({
    sources: [
      { id: "source-a", householdId: HOUSE_A },
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
    participants: [
      { id: "part-a", accountId: "account-a", householdId: HOUSE_A },
      { id: "part-other-account", accountId: "account-a-other", householdId: HOUSE_A },
      { id: "part-b", accountId: "account-b", householdId: HOUSE_B },
    ],
  });
  return {
    ...refs,
    expense: {
      create: vi.fn().mockResolvedValue({
        id: "exp-1",
        householdId: HOUSE_A,
        accountId: "account-a",
        category: "Alimentação",
        amount: 150,
        status: "PENDING",
        expenseSplitType: "SHARED",
        paidByParticipantId: "part-a",
      }),
      findUnique: vi.fn().mockResolvedValue({
        id: "exp-1",
        accountId: "account-a",
        amount: 150,
        expenseSplitType: "SHARED",
        paidByParticipantId: "part-a",
        account: {
          participants: [{ id: "part-a", defaultShare: 1 }],
        },
      }),
    },
    expenseSplit: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  } as any;
}

describe("createExpense tenant isolation", () => {
  it("aceita FKs inteiramente da mesma casa e persiste a despesa", async () => {
    const prisma = prismaForExpense();
    const result = await createExpense(
      prisma,
      HOUSE_A,
      {
        ...baseInput,
        accountId: "account-a",
        sourceId: "source-a",
        categoryId: "cat-a",
        paidByParticipantId: "part-a",
      },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toMatchObject({ id: "exp-1" });
    expect(prisma.expense.create).toHaveBeenCalledTimes(1);
    expect(prisma.expenseSplit.createMany).toHaveBeenCalledTimes(1);
  });

  it("rejeita accountId de outro household sem criar despesa nem split", async () => {
    const prisma = prismaForExpense();
    const result = await createExpense(
      prisma,
      HOUSE_A,
      { ...baseInput, accountId: "account-b" },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.expense.create).not.toHaveBeenCalled();
    expect(prisma.expense.findUnique).not.toHaveBeenCalled();
    expect(prisma.expenseSplit.createMany).not.toHaveBeenCalled();
  });

  it("rejeita sourceId de outro household sem criar despesa", async () => {
    const prisma = prismaForExpense();
    const result = await createExpense(
      prisma,
      HOUSE_A,
      { ...baseInput, sourceId: "source-b" },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.expense.create).not.toHaveBeenCalled();
    expect(prisma.expenseSplit.createMany).not.toHaveBeenCalled();
  });

  it("rejeita categoryId de outro household em vez de gravar FK com nome Outros", async () => {
    const prisma = prismaForExpense();
    const result = await createExpense(
      prisma,
      HOUSE_A,
      { amount: 10, dueDate: "2025-03-15", categoryId: "cat-b" },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.expense.create).not.toHaveBeenCalled();
  });

  it("rejeita paidByParticipantId de outra conta mesmo no mesmo household", async () => {
    const prisma = prismaForExpense();
    const result = await createExpense(
      prisma,
      HOUSE_A,
      {
        ...baseInput,
        accountId: "account-a",
        paidByParticipantId: "part-other-account",
      },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.expense.create).not.toHaveBeenCalled();
    expect(prisma.expenseSplit.createMany).not.toHaveBeenCalled();
  });
});
