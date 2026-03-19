import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  usageEvent: {
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  usageAggregate: { findMany: vi.fn() },
  tenant: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("usageAnalyticsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("toDateRange", () => {
    it("7d: intervalo cobre 7 dias (incluindo hoje)", async () => {
      const { toDateRange } = await import("../usageAnalyticsService");
      const now = new Date("2025-03-15T12:00:00Z");
      const range = toDateRange("7d", now);
      const days = Math.round((range.to.getTime() - range.from.getTime()) / (24 * 60 * 60 * 1000));
      expect(days).toBe(7);
      expect(range.from.getTime()).toBeLessThanOrEqual(range.to.getTime());
    });

    it("30d: intervalo cobre 30 dias", async () => {
      const { toDateRange } = await import("../usageAnalyticsService");
      const now = new Date("2025-03-15T12:00:00Z");
      const range = toDateRange("30d", now);
      const days = Math.round((range.to.getTime() - range.from.getTime()) / (24 * 60 * 60 * 1000));
      expect(days).toBe(30);
      expect(range.from.getTime()).toBeLessThanOrEqual(range.to.getTime());
    });
  });

  describe("getUsageMetrics", () => {
    it("retorna totais e byPeriod a partir de aggregates", async () => {
      mockPrisma.usageEvent.aggregate
        .mockResolvedValueOnce({ _sum: { quantity: 100 } })
        .mockResolvedValueOnce({ _sum: { quantity: 30 } });
      mockPrisma.usageAggregate.findMany.mockResolvedValue([
        { period: "2025-03", messagesCount: 80, aiCount: 20 },
      ]);

      const { getUsageMetrics } = await import("../usageAnalyticsService");
      const range = {
        from: new Date(Date.UTC(2025, 2, 1)),
        to: new Date(Date.UTC(2025, 2, 31, 23, 59, 59)),
      };
      const m = await getUsageMetrics(range);

      expect(m.totalMessages).toBe(100);
      expect(m.totalAi).toBe(30);
      const march = m.byPeriod.find((p) => p.period === "2025-03");
      expect(march).toBeDefined();
      expect(march!.messagesCount).toBe(80);
      expect(march!.aiCount).toBe(20);
    });
  });

  describe("getTopTenantsByUsage", () => {
    it("retorna ranking ordenado por total de uso e respeita limit", async () => {
      mockPrisma.usageEvent.groupBy
        .mockResolvedValueOnce([
          { tenantId: "t1", _sum: { quantity: 10 }, _count: { id: 5 } },
          { tenantId: "t2", _sum: { quantity: 20 }, _count: { id: 8 } },
        ])
        .mockResolvedValueOnce([
          { tenantId: "t1", _sum: { quantity: 50 } },
          { tenantId: "t2", _sum: { quantity: 100 } },
        ])
        .mockResolvedValueOnce([
          { tenantId: "t1", _sum: { quantity: 10 } },
          { tenantId: "t2", _sum: { quantity: 20 } },
        ]);
      mockPrisma.tenant.findMany.mockResolvedValue([
        { id: "t1", name: "Tenant A", plan: "PRO" },
        { id: "t2", name: "Tenant B", plan: "SCALE" },
      ]);

      const { getTopTenantsByUsage } = await import("../usageAnalyticsService");
      const range = {
        from: new Date("2025-03-01"),
        to: new Date("2025-03-31"),
      };
      const rows = await getTopTenantsByUsage(range, 2);

      expect(rows).toHaveLength(2);
      expect(rows[0].tenantId).toBe("t2");
      expect(rows[0].totalUsage).toBe(120); // 100 msg + 20 ai
      expect(rows[0].tenantName).toBe("Tenant B");
      expect(rows[1].tenantId).toBe("t1");
      expect(rows[1].totalUsage).toBe(60);
    });
  });
});
