import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTenantRevenueMetrics } from "../revenueMetricsService";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    waInboxThread: {
      aggregate: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("getTenantRevenueMetrics", () => {
  beforeEach(() => {
    vi.mocked(prisma.waInboxThread.aggregate).mockResolvedValue({
      _sum: { dealValue: 100 },
      _count: { _all: 2 },
    } as never);
    vi.mocked(prisma.waInboxThread.count).mockResolvedValue(10);
  });

  it("calcula receita, ticket médio e taxa de conversão", async () => {
    const m = await getTenantRevenueMetrics("tenant-1", 30);
    expect(m.dealsWon).toBe(2);
    expect(m.totalRevenue).toBe(100);
    expect(m.activeThreads).toBe(10);
    expect(m.conversionRate).toBe(0.2);
    expect(m.avgTicket).toBe(50);
    expect(m.days).toBe(30);
  });
});
