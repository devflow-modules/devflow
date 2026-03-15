import { describe, it, expect, vi } from "vitest";
import { listExpenses } from "@/modules/financeiro/services/expenses/listExpenses";

describe("listExpenses", () => {
  it("deve retornar lista vazia quando não há despesas", async () => {
    const prisma = {
      expense: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as any;

    const result = await listExpenses(prisma, "household-1");

    expect(result).toEqual([]);
  });

  it("deve retornar despesas do household", async () => {
    const mockExpenses = [
      {
        id: "exp-1",
        category: "Alimentação",
        amount: 100,
        householdId: "household-1",
        dueDate: new Date("2025-02-01"),
        status: "PENDING",
        source: null,
      },
    ];
    const prisma = {
      expense: {
        findMany: vi.fn().mockResolvedValue(mockExpenses),
      },
    } as any;

    const result = await listExpenses(prisma, "household-1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("exp-1");
    expect(result[0].category).toBe("Alimentação");
    expect(result[0].amount).toBe(100);
  });
});
