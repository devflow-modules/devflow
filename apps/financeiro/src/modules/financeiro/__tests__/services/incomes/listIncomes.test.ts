import { describe, it, expect, vi } from "vitest";
import { listIncomes } from "@/modules/financeiro/services/incomes/listIncomes";

describe("listIncomes", () => {
  it("deve retornar lista vazia quando não há receitas", async () => {
    const prisma = {
      income: { findMany: vi.fn().mockResolvedValue([]) },
    } as any;

    const result = await listIncomes(prisma, "household-1");

    expect(result).toEqual([]);
    expect(prisma.income.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { householdId: "household-1" },
        orderBy: { receivedAt: "desc" },
        include: { source: true },
      })
    );
  });

  it("deve retornar receitas do household com source", async () => {
    const mockIncomes = [
      {
        id: "inc-1",
        amount: 5000,
        householdId: "household-1",
        receivedAt: new Date("2025-02-01"),
        source: { id: "src-1", name: "Salário" },
      },
    ];
    const prisma = {
      income: { findMany: vi.fn().mockResolvedValue(mockIncomes) },
    } as any;

    const result = await listIncomes(prisma, "household-1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("inc-1");
    expect(result[0].amount).toBe(5000);
    expect(result[0].source?.name).toBe("Salário");
  });
});
