import { describe, it, expect, vi } from "vitest";
import { updateExpense } from "@/modules/financeiro/services/expenses/updateExpense";
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
      { id: "part-b", accountId: "account-b", householdId: HOUSE_B },
    ],
  });
  return {
    ...refs,
    expense: {
      findFirst: vi.fn().mockResolvedValue({ accountId: "account-a" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue({
        id: "exp-1",
        householdId: HOUSE_A,
        category: "Alimentação",
        amount: 80,
      }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  } as any;
}

describe("updateExpense tenant isolation", () => {
  it("aceita sourceId e categoryId da mesma casa", async () => {
    const prisma = prismaForUpdate();
    const result = await updateExpense(
      prisma,
      "exp-1",
      HOUSE_A,
      { sourceId: "source-a", categoryId: "cat-a" },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toMatchObject({ id: "exp-1" });
    expect(prisma.expense.updateMany).toHaveBeenCalledTimes(1);
  });

  it("rejeita sourceId de outro household sem mutação", async () => {
    const prisma = prismaForUpdate();
    const result = await updateExpense(
      prisma,
      "exp-1",
      HOUSE_A,
      { sourceId: "source-b" },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.expense.updateMany).not.toHaveBeenCalled();
  });

  it("rejeita categoryId de outro household sem mutação", async () => {
    const prisma = prismaForUpdate();
    const result = await updateExpense(
      prisma,
      "exp-1",
      HOUSE_A,
      { categoryId: "cat-b" },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.expense.updateMany).not.toHaveBeenCalled();
  });

  it("permite remover sourceId e categoryId com null", async () => {
    const prisma = prismaForUpdate();
    const result = await updateExpense(
      prisma,
      "exp-1",
      HOUSE_A,
      { sourceId: null, categoryId: null },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toMatchObject({ id: "exp-1" });
    expect(prisma.source.findMany).not.toHaveBeenCalled();
    expect(prisma.category.findMany).not.toHaveBeenCalled();
    expect(prisma.expense.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sourceId: null, categoryId: null }),
      })
    );
  });

  it("rejeita accountId de outro household sem mutação", async () => {
    const prisma = prismaForUpdate();
    const result = await updateExpense(
      prisma,
      "exp-1",
      HOUSE_A,
      { accountId: "account-b" },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.expense.updateMany).not.toHaveBeenCalled();
  });

  it("rejeita paidByParticipantId de outra conta mesmo com accountId local", async () => {
    const prisma = prismaForUpdate();
    const result = await updateExpense(
      prisma,
      "exp-1",
      HOUSE_A,
      { accountId: "account-a", paidByParticipantId: "part-b" },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toEqual({ ok: false, error: HOUSEHOLD_REF_NOT_FOUND });
    expect(prisma.expense.updateMany).not.toHaveBeenCalled();
  });

  it("aceita paidByParticipantId usando a accountId já persistida", async () => {
    const prisma = prismaForUpdate();
    const result = await updateExpense(
      prisma,
      "exp-1",
      HOUSE_A,
      { paidByParticipantId: "part-a" },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(result).toMatchObject({ id: "exp-1" });
    expect(prisma.expense.findFirst).toHaveBeenCalledWith({
      where: { id: "exp-1", householdId: HOUSE_A },
      select: { accountId: true },
    });
    expect(prisma.expense.updateMany).toHaveBeenCalledTimes(1);
  });

  it("não valida FKs quando os campos estão ausentes", async () => {
    const prisma = prismaForUpdate();
    await updateExpense(
      prisma,
      "exp-1",
      HOUSE_A,
      { amount: 40 },
      { userId: "u1", householdId: HOUSE_A }
    );

    expect(prisma.source.findMany).not.toHaveBeenCalled();
    expect(prisma.category.findMany).not.toHaveBeenCalled();
    expect(prisma.expense.updateMany).toHaveBeenCalledTimes(1);
  });
});
