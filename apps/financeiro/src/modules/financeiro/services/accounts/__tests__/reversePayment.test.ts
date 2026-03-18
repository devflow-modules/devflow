import { describe, it, expect, vi } from "vitest";
import { reversePayment } from "@/modules/financeiro/services/accounts/reversePayment";

describe("reversePayment", () => {
  it("NOT_FOUND quando household diverge", async () => {
    const prisma = {
      payment: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn(),
    } as never;
    const r = await reversePayment(prisma, "p1", "h1");
    expect(r).toEqual({ ok: false, code: "NOT_FOUND" });
  });

  it("EXCEEDS_REFUNDABLE quando pedido maior que líquido", async () => {
    const prisma = {
      payment: {
        findFirst: vi.fn().mockResolvedValue({
          id: "p1",
          settlementId: "s1",
          amount: "50",
          reversals: [],
          settlement: { account: { householdId: "h1" } },
        }),
      },
      $transaction: vi.fn(),
    } as never;
    const r = await reversePayment(prisma, "p1", "h1", 100);
    expect(r).toEqual({ ok: false, code: "EXCEEDS_REFUNDABLE" });
  });
});
