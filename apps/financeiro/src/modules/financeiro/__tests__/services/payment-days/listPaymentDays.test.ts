import { describe, it, expect, vi } from "vitest";
import { listPaymentDays } from "@/modules/financeiro/services/payment-days/listPaymentDays";

describe("listPaymentDays", () => {
  it("deve retornar lista vazia quando não há dias de recebimento", async () => {
    const prisma = {
      paymentDay: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as any;

    const result = await listPaymentDays(prisma, "household-1");

    expect(result).toEqual([]);
    expect(prisma.paymentDay.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { source: { householdId: "household-1" } },
        orderBy: { dayOfMonth: "asc" },
      })
    );
  });

  it("deve retornar dias de recebimento do household", async () => {
    const mockDays = [
      { id: "pd1", dayOfMonth: 5, sourceId: "src-1", description: "Salário" },
    ];
    const prisma = {
      paymentDay: { findMany: vi.fn().mockResolvedValue(mockDays) },
    } as any;

    const result = await listPaymentDays(prisma, "household-1");

    expect(result).toHaveLength(1);
    expect(result[0].dayOfMonth).toBe(5);
  });
});
