import { describe, it, expect, vi } from "vitest";
import { applyPayment } from "@/modules/financeiro/services/accounts/settlements";

describe("applyPayment", () => {
  it("rejeita valor inválido", async () => {
    const prisma = {} as never;
    const r = await applyPayment(prisma, "x", 0, "h1");
    expect(r).toEqual({ ok: false, code: "INVALID_AMOUNT" });
  });

  it("rejeita quando household diverge", async () => {
    const prisma = {
      settlement: {
        findFirst: vi.fn().mockResolvedValue({
          id: "s1",
          accountId: "a1",
          amount: "100",
          account: { householdId: "other" },
        }),
      },
      $transaction: vi.fn(),
    } as never;
    const r = await applyPayment(prisma, "s1", 10, "h1");
    expect(r).toEqual({ ok: false, code: "NOT_FOUND" });
  });
});
