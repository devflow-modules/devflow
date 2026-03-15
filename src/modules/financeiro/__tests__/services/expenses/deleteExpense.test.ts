import { describe, it, expect, vi } from "vitest";
import { deleteExpense } from "@/modules/financeiro/services/expenses/deleteExpense";

describe("deleteExpense", () => {
  it("deve retornar true quando despesa existe e pertence ao household", async () => {
    const prisma = {
      expense: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    } as any;

    const result = await deleteExpense(prisma, "exp-1", "h1", {
      userId: "u1",
      householdId: "h1",
    });

    expect(result).toBe(true);
    expect(prisma.expense.deleteMany).toHaveBeenCalledWith({
      where: { id: "exp-1", householdId: "h1" },
    });
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it("deve retornar false quando nenhuma despesa for deletada", async () => {
    const prisma = {
      expense: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      auditLog: { create: vi.fn() },
    } as any;

    const result = await deleteExpense(prisma, "exp-inexistente", "h1", {
      userId: "u1",
      householdId: "h1",
    });

    expect(result).toBe(false);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});
