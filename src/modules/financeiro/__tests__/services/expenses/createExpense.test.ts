import { describe, it, expect, vi } from "vitest";
import { createExpense } from "@/modules/financeiro/services/expenses/createExpense";

describe("createExpense", () => {
  it("deve criar despesa e retornar entidade com id", async () => {
    const created = {
      id: "exp-new",
      category: "Alimentação",
      amount: 150,
      householdId: "h1",
      dueDate: new Date("2025-03-15"),
      status: "PENDING",
    };
    const prisma = {
      expense: { create: vi.fn().mockResolvedValue(created) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    } as any;

    const result = await createExpense(
      prisma,
      "h1",
      { category: "Alimentação", amount: 150, dueDate: "2025-03-15" },
      { userId: "u1", householdId: "h1" }
    );

    expect(result.id).toBe("exp-new");
    expect(result.amount).toBe(150);
    expect(prisma.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "Alimentação", amount: 150, householdId: "h1" }),
      })
    );
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it("deve chamar prisma com householdId do contexto", async () => {
    const prisma = {
      expense: { create: vi.fn().mockResolvedValue({ id: "e1", householdId: "h2" }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    } as any;

    await createExpense(
      prisma,
      "h2",
      { category: "Transporte", amount: 50, dueDate: "2025-04-01" },
      { userId: "u1", householdId: "h2" }
    );

    expect(prisma.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ householdId: "h2" }) })
    );
  });
});
