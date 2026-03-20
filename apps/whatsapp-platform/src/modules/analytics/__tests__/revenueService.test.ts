import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  billingSubscription: { findMany: vi.fn() },
  tenant: { count: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("revenueService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calcula MRR corretamente a partir de assinaturas ativas", async () => {
    mockPrisma.billingSubscription.findMany.mockResolvedValue([
      { plan: "PRO", status: "active" },
      { plan: "PRO", status: "active" },
      { plan: "SCALE", status: "trialing" },
    ]);
    mockPrisma.tenant.count.mockResolvedValue(10);

    const { getRevenueMetrics } = await import("../revenueService");
    const m = await getRevenueMetrics();

    // PRO=99, SCALE=249 (plans.ts defaults)
    expect(m.mrr).toBe(99 + 99 + 249);
    expect(m.arr).toBe(m.mrr * 12);
    expect(m.activeSubscriptions).toBe(3);
  });

  it("calcula ARPU como MRR / assinaturas ativas", async () => {
    mockPrisma.billingSubscription.findMany.mockResolvedValue([
      { plan: "PRO", status: "active" },
      { plan: "PRO", status: "active" },
    ]);
    mockPrisma.tenant.count.mockResolvedValue(5);

    const { getRevenueMetrics } = await import("../revenueService");
    const m = await getRevenueMetrics();

    // 2 PRO = 198, ARPU = 198/2 = 99
    expect(m.arpu).toBe(99);
    expect(m.totalTenants).toBe(5);
  });

  it("calcula churn como cancelados / (ativos + cancelados)", async () => {
    mockPrisma.billingSubscription.findMany.mockResolvedValue([
      { plan: "PRO", status: "active" },
      { plan: "PRO", status: "active" },
      { plan: "SCALE", status: "canceled" },
    ]);
    mockPrisma.tenant.count.mockResolvedValue(3);

    const { getRevenueMetrics } = await import("../revenueService");
    const m = await getRevenueMetrics();

    expect(m.activeSubscriptions).toBe(2);
    expect(m.canceledInPeriod).toBe(1);
    expect(m.churnRate).toBe(Number(((1 / 3) * 100).toFixed(2))); // 33.33
  });

  it("retorna zeros quando não há assinaturas", async () => {
    mockPrisma.billingSubscription.findMany.mockResolvedValue([]);
    mockPrisma.tenant.count.mockResolvedValue(0);

    const { getRevenueMetrics } = await import("../revenueService");
    const m = await getRevenueMetrics();

    expect(m.mrr).toBe(0);
    expect(m.arr).toBe(0);
    expect(m.arpu).toBe(0);
    expect(m.churnRate).toBe(0);
  });
});
