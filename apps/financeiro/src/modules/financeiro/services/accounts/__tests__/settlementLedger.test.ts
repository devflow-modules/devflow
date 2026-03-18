import { describe, it, expect, vi } from "vitest";
import {
  computeNetPaidForSettlement,
  syncSettlementPaidFromLedger,
} from "@/modules/financeiro/services/accounts/settlementLedger";

function mockDb(overrides: {
  payments?: { amount: string; reversals: { amount: string }[] }[];
  settlement?: { amount: string; paidAmount?: string; completedAt?: Date | null; reopenedAt?: Date | null };
}) {
  const settlement = overrides.settlement ?? {
    amount: "100",
    paidAmount: "0",
    completedAt: null,
    reopenedAt: null,
  };
  return {
    payment: {
      findMany: vi.fn().mockResolvedValue(overrides.payments ?? []),
    },
    settlement: {
      findUnique: vi.fn().mockResolvedValue({ id: "s1", ...settlement }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

describe("computeNetPaidForSettlement", () => {
  it("soma pagamentos menos estornos", async () => {
    const db = mockDb({
      payments: [
        { amount: "50", reversals: [{ amount: "10" }] },
        { amount: "30", reversals: [] },
      ],
    });
    const net = await computeNetPaidForSettlement(db as never, "s1");
    expect(net).toBe(70);
  });

  it("nunca negativo", async () => {
    const db = mockDb({
      payments: [{ amount: "10", reversals: [{ amount: "20" }] }],
    });
    const net = await computeNetPaidForSettlement(db as never, "s1");
    expect(net).toBe(0);
  });
});

describe("syncSettlementPaidFromLedger", () => {
  it("PENDING quando net zero", async () => {
    const db = mockDb({ payments: [] });
    await syncSettlementPaidFromLedger(db as never, "s1");
    expect(db.settlement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING" }),
      })
    );
  });

  it("COMPLETED quando net >= total", async () => {
    const db = mockDb({
      payments: [{ amount: "100", reversals: [] }],
      settlement: { amount: "100", reopenedAt: null },
    });
    await syncSettlementPaidFromLedger(db as never, "s1");
    expect(db.settlement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED" }),
      })
    );
  });

  it("PARTIAL quando reopened e quitado", async () => {
    const db = mockDb({
      payments: [{ amount: "100", reversals: [] }],
      settlement: { amount: "100", reopenedAt: new Date() },
    });
    await syncSettlementPaidFromLedger(db as never, "s1");
    expect(db.settlement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PARTIAL" }),
      })
    );
  });
});
