import { describe, it, expect, vi } from "vitest";
import { getDashboardSummary } from "@/modules/financeiro/services/dashboard/getDashboardSummary";

describe("getDashboardSummary", () => {
  it("deve retornar série com totais zerados quando não há dados", async () => {
    const prisma = {
      income: { findMany: vi.fn().mockResolvedValue([]) },
      expense: { findMany: vi.fn().mockResolvedValue([]) },
    } as any;

    const result = await getDashboardSummary(prisma, {
      householdId: "household-1",
      months: 3,
    });

    expect(result.series).toHaveLength(3);
    result.series.forEach((item) => {
      expect(item.incomes).toBe(0);
      expect(item.expenses).toBe(0);
      expect(item.balance).toBe(0);
    });
  });

  it("deve chamar prisma com householdId e retornar estrutura de series", async () => {
    const prisma = {
      income: { findMany: vi.fn().mockResolvedValue([]) },
      expense: { findMany: vi.fn().mockResolvedValue([]) },
    } as any;

    const result = await getDashboardSummary(prisma, {
      householdId: "casa-123",
      months: 6,
    });

    expect(prisma.income.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ householdId: "casa-123" }),
      })
    );
    expect(prisma.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ householdId: "casa-123" }),
      })
    );
    expect(result.series).toHaveLength(6);
    expect(result.series[0]).toHaveProperty("key");
    expect(result.series[0]).toHaveProperty("label");
    expect(result.series[0]).toHaveProperty("incomes");
    expect(result.series[0]).toHaveProperty("expenses");
    expect(result.series[0]).toHaveProperty("balance");
  });
});
