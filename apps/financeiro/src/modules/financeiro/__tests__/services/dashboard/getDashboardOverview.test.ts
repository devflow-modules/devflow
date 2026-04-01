import { describe, it, expect, vi } from "vitest";
import { getDashboardOverview } from "@/modules/financeiro/services/dashboard/getDashboardOverview";

describe("getDashboardOverview", () => {
  it("agrega despesas do mês e progresso de orçamento", async () => {
    const catId = "cat-1";
    const prisma = {
      expense: {
        findMany: vi.fn().mockResolvedValue([
          {
            amount: 100,
            categoryId: catId,
            category: "Supermercado · demo",
            categoryRef: { id: catId, name: "Supermercado · demo", color: "#22c55e" },
          },
          {
            amount: 50,
            categoryId: catId,
            category: "Supermercado · demo",
            categoryRef: { id: catId, name: "Supermercado · demo", color: "#22c55e" },
          },
        ]),
      },
      budget: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "bud-1",
            categoryId: catId,
            monthlyLimit: { toString: () => "200" },
            category: { id: catId, name: "Supermercado · demo", color: "#22c55e" },
          },
        ]),
      },
    } as any;

    const result = await getDashboardOverview(prisma, "household-1");

    expect(result.totalSpent).toBe(150);
    expect(result.categoryBreakdown).toHaveLength(1);
    expect(result.categoryBreakdown[0]?.value).toBe(150);
    expect(result.budgetProgress).toHaveLength(1);
    expect(result.budgetProgress[0]?.spent).toBe(150);
    expect(result.budgetProgress[0]?.monthlyLimit).toBe(200);
    expect(result.budgetProgress[0]?.percent).toBe(75);
  });

  it("retorna zeros quando não há despesas no mês", async () => {
    const prisma = {
      expense: { findMany: vi.fn().mockResolvedValue([]) },
      budget: { findMany: vi.fn().mockResolvedValue([]) },
    } as any;

    const result = await getDashboardOverview(prisma, "h1");
    expect(result.totalSpent).toBe(0);
    expect(result.categoryBreakdown).toHaveLength(0);
    expect(result.budgetProgress).toHaveLength(0);
  });
});
