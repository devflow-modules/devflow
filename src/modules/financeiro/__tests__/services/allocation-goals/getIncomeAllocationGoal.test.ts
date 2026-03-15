import { describe, it, expect, vi } from "vitest";
import { getIncomeAllocationGoal } from "@/modules/financeiro/services/allocation-goals/getIncomeAllocationGoal";

describe("getIncomeAllocationGoal", () => {
  it("deve retornar null quando não existe meta para o período", async () => {
    const prisma = {
      incomeAllocationGoal: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as any;

    const result = await getIncomeAllocationGoal(prisma, "household-1", 2025, 3);

    expect(result).toBeNull();
    expect(prisma.incomeAllocationGoal.findUnique).toHaveBeenCalledWith({
      where: { householdId_year_month: { householdId: "household-1", year: 2025, month: 3 } },
    });
  });

  it("deve retornar meta quando existir", async () => {
    const mockGoal = {
      id: "g1",
      householdId: "household-1",
      year: 2025,
      month: 3,
      investmentPercent: 20,
      savingsPercent: 10,
    };
    const prisma = {
      incomeAllocationGoal: { findUnique: vi.fn().mockResolvedValue(mockGoal) },
    } as any;

    const result = await getIncomeAllocationGoal(prisma, "household-1", 2025, 3);

    expect(result).not.toBeNull();
    expect(result?.id).toBe("g1");
    expect(result?.investmentPercent).toBe(20);
  });
});
