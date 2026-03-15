import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCounters, resetMetrics } from "@/modules/financeiro/adapters/metrics/financeMetrics";
import { createExpense } from "@/modules/financeiro/services/expenses/createExpense";

/**
 * Garante que, ao executar createExpense, o evento finance.expense.created
 * é emitido e o handler de métricas incrementa o contador.
 */
describe("emit a partir de service (createExpense)", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("deve incrementar métrica de despesas criadas após createExpense", async () => {
    const prisma = {
      expense: {
        create: vi.fn().mockResolvedValue({
          id: "exp-1",
          category: "Alimentação",
          amount: 100,
          householdId: "h1",
          dueDate: new Date(),
          status: "PENDING",
        }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    } as any;

    await createExpense(
      prisma,
      "h1",
      { category: "Alimentação", amount: 100, dueDate: "2025-03-15" },
      { userId: "u1", householdId: "h1" }
    );

    const counters = getCounters();
    expect(counters["finance.expenses.created.count"]).toBe(1);
  });
});
