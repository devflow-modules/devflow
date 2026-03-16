import { describe, it, expect, vi } from "vitest";
import { updateExpense } from "@/modules/financeiro/services/expenses/updateExpense";

describe("updateExpense", () => {
  it("deve atualizar despesa e retornar entidade quando existir", async () => {
    const updated = {
      id: "exp-1",
      category: "Transporte",
      amount: 80,
      householdId: "h1",
      dueDate: new Date("2025-04-01"),
      status: "PAID",
    };
    const prisma = {
      expense: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue(updated),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    } as any;

    const result = await updateExpense(
      prisma,
      "exp-1",
      "h1",
      { amount: 80, status: "PAID" },
      { userId: "u1", householdId: "h1" }
    );

    expect(result).not.toBeNull();
    expect(result?.amount).toBe(80);
    expect(prisma.expense.updateMany).toHaveBeenCalledWith({
      where: { id: "exp-1", householdId: "h1" },
      data: expect.any(Object),
    });
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it("deve retornar null quando despesa não pertence ao household", async () => {
    const prisma = {
      expense: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUnique: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    } as any;

    const result = await updateExpense(
      prisma,
      "exp-1",
      "h1",
      { amount: 50 },
      { userId: "u1", householdId: "h1" }
    );

    expect(result).toBeNull();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});
