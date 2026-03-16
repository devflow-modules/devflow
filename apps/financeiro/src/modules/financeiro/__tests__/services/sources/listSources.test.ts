import { describe, it, expect, vi } from "vitest";
import { listSources } from "@/modules/financeiro/services/sources/listSources";

describe("listSources", () => {
  it("deve retornar lista vazia quando não há fontes", async () => {
    const prisma = {
      source: { findMany: vi.fn().mockResolvedValue([]) },
    } as any;

    const result = await listSources(prisma, "household-1");

    expect(result).toEqual([]);
    expect(prisma.source.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { householdId: "household-1" },
        orderBy: { createdAt: "desc" },
        include: { paymentDays: { include: { cycle: true } } },
      })
    );
  });

  it("deve retornar fontes do household", async () => {
    const mockSources = [
      { id: "src-1", name: "Salário", householdId: "household-1", sourceType: "PF", paymentDays: [] },
    ];
    const prisma = {
      source: { findMany: vi.fn().mockResolvedValue(mockSources) },
    } as any;

    const result = await listSources(prisma, "household-1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("src-1");
    expect(result[0].name).toBe("Salário");
  });
});
