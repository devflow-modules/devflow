import { describe, it, expect, vi } from "vitest";
import { listRules } from "@/modules/financeiro/services/rules/listRules";

describe("listRules", () => {
  it("deve retornar lista vazia quando não há regras", async () => {
    const prisma = {
      rule: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as any;

    const result = await listRules(prisma, "household-1");

    expect(result).toEqual([]);
    expect(prisma.rule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { householdId: "household-1" },
        include: { ruleSources: { include: { source: true } } },
      })
    );
  });

  it("deve retornar regras com ruleSources e source", async () => {
    const mockRules = [
      {
        id: "rule-1",
        name: "Rateio 50%",
        ruleType: "CATEGORY_PERCENTAGE",
        householdId: "household-1",
        ruleSources: [{ id: "rs1", sourceId: "src-1", source: { id: "src-1", name: "Fonte A" } }],
      },
    ];
    const prisma = {
      rule: { findMany: vi.fn().mockResolvedValue(mockRules) },
    } as any;

    const result = await listRules(prisma, "household-1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("rule-1");
    expect(result[0].ruleSources).toHaveLength(1);
    expect(result[0].ruleSources[0].source.name).toBe("Fonte A");
  });
});
