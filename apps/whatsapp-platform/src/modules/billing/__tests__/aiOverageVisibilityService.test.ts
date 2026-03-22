import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCount = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    billingAuditLog: {
      count: (...a: unknown[]) => mockCount(...a),
    },
  },
}));

vi.mock("../planConfig", () => ({
  getUsageUnitPricesBrl: () => ({ message: 0.03, aiResponse: 0.09 }),
}));

describe("aiOverageVisibilityService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCount.mockResolvedValue(0);
  });

  it("retorna zero quando não há eventos faturados", async () => {
    const { getAiOverageBilledInPeriod } = await import(
      "../aiOverageVisibilityService"
    );
    const result = await getAiOverageBilledInPeriod("t1", "2025-03");
    expect(result).toEqual({
      aiOverageBilled: 0,
      aiOverageCostBrl: 0,
    });
    expect(mockCount).toHaveBeenCalledWith({
      where: {
        tenantId: "t1",
        eventType: "AI_OVERAGE_METER_SENT",
        source: "usage",
        createdAt: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
      },
    });
  });

  it("conta eventos e calcula custo corretamente", async () => {
    mockCount.mockResolvedValue(25);
    const { getAiOverageBilledInPeriod } = await import(
      "../aiOverageVisibilityService"
    );
    const result = await getAiOverageBilledInPeriod("t2", "2025-02");
    expect(result.aiOverageBilled).toBe(25);
    expect(result.aiOverageCostBrl).toBe(2.25); // 25 * 0.09
  });

  it("usa período correto para YYYY-MM", async () => {
    const { getAiOverageBilledInPeriod } = await import(
      "../aiOverageVisibilityService"
    );
    await getAiOverageBilledInPeriod("t1", "2025-01");
    const call = mockCount.mock.calls[0][0];
    const gte = call.where.createdAt.gte as Date;
    const lte = call.where.createdAt.lte as Date;
    expect(gte.getUTCFullYear()).toBe(2025);
    expect(gte.getUTCMonth()).toBe(0); // janeiro
    expect(lte.getUTCFullYear()).toBe(2025);
    expect(lte.getUTCMonth()).toBe(0);
  });

  it("arredonda custo para 2 decimais", async () => {
    mockCount.mockResolvedValue(3);
    const { getAiOverageBilledInPeriod } = await import(
      "../aiOverageVisibilityService"
    );
    const result = await getAiOverageBilledInPeriod("t1", "2025-03");
    expect(result.aiOverageCostBrl).toBe(0.27); // 3 * 0.09
  });
});
