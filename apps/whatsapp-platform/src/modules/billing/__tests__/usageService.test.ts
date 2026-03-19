import { describe, it, expect, vi, beforeEach } from "vitest";
import { UsageEventType } from "@/generated/prisma-whatsapp";

const tx = vi.fn(async (fn: (t: unknown) => Promise<string>) => {
  mockTx.usageEvent.create.mockResolvedValue({ id: "ev-test-1" });
  await fn(mockTx);
  return "ev-test-1";
});
const mockTx = {
  usageEvent: { create: vi.fn() },
  usageAggregate: { upsert: vi.fn() },
};

const mockPrisma = {
  $transaction: tx,
  usageAggregate: { findUnique: vi.fn() },
  usageEvent: { aggregate: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("../stripeMeteredService", () => ({
  isMeteredBillingConfigured: () => false,
  queueReportUsageToStripe: vi.fn(),
}));

describe("usageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.usageEvent.create.mockResolvedValue({});
    mockTx.usageAggregate.upsert.mockResolvedValue({});
  });

  it("trackUsage grava MESSAGE_SENT e agrega", async () => {
    const { trackUsage } = await import("../usageService");
    trackUsage("t1", UsageEventType.MESSAGE_SENT, { quantity: 1 });
    await new Promise((r) => setTimeout(r, 30));
    expect(tx).toHaveBeenCalled();
    expect(mockTx.usageEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "t1",
          type: UsageEventType.MESSAGE_SENT,
        }),
      })
    );
  });

  it("ignora tenant env", async () => {
    const { trackUsage } = await import("../usageService");
    trackUsage("env", UsageEventType.MESSAGE_SENT);
    await new Promise((r) => setTimeout(r, 20));
    expect(tx).not.toHaveBeenCalled();
  });

  it("getUsageByPeriod usa agregado quando existe", async () => {
    mockPrisma.usageAggregate.findUnique.mockResolvedValue({
      messagesCount: 10,
      aiCount: 3,
    });
    const { getUsageByPeriod } = await import("../usageService");
    const u = await getUsageByPeriod("t1", "2025-03");
    expect(u.messagesSent).toBe(10);
    expect(u.aiResponses).toBe(3);
  });
});
