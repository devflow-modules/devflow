import { describe, it, expect, vi } from "vitest";
import { listCycles } from "@/modules/financeiro/services/cycles/listCycles";

describe("listCycles", () => {
  it("deve retornar lista vazia quando não há ciclos", async () => {
    const prisma = {
      cycle: { findMany: vi.fn().mockResolvedValue([]) },
    } as any;

    const result = await listCycles(prisma, "household-1");

    expect(result).toEqual([]);
    expect(prisma.cycle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { householdId: "household-1" },
        orderBy: [{ cycleType: "asc" }, { name: "asc" }],
      })
    );
  });

  it("deve retornar ciclos do household", async () => {
    const mockCycles = [
      { id: "c1", name: "Mensal", cycleType: "MONTHLY", householdId: "household-1", anchorDay: 1 },
    ];
    const prisma = {
      cycle: { findMany: vi.fn().mockResolvedValue(mockCycles) },
    } as any;

    const result = await listCycles(prisma, "household-1");

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Mensal");
    expect(result[0].cycleType).toBe("MONTHLY");
  });
});
