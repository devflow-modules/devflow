import { describe, it, expect, vi, beforeEach } from "vitest";
import { UsageMetricType } from "@/generated/prisma-whatsapp";

const mockGetTenantPlan = vi.fn();
const mockGetUsageByPeriod = vi.fn();
vi.mock("../subscriptionService", () => ({
  getTenantPlan: (...args: unknown[]) => mockGetTenantPlan(...args),
}));
vi.mock("../usageService", () => ({
  periodYYYYMM: () => "2025-03",
  getUsageByPeriod: (...args: unknown[]) => mockGetUsageByPeriod(...args),
}));

const mockUpsert = vi.fn();
const mockFindUnique = vi.fn();
const mockPrisma = {
  usageMetric: {
    upsert: mockUpsert,
    findUnique: mockFindUnique,
  },
};
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("usage.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({});
    mockFindUnique.mockResolvedValue(null);
    mockGetUsageByPeriod.mockResolvedValue({ messagesSent: 0, aiResponses: 0 });
  });

  it("incrementUsage não faz nada para MESSAGES e AI_CALLS", async () => {
    const { incrementUsage } = await import("../usage.service");
    await incrementUsage("t1", UsageMetricType.MESSAGES);
    await incrementUsage("t1", UsageMetricType.AI_CALLS);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("incrementUsage grava UsageMetric para AUTOMATIONS", async () => {
    const { incrementUsage } = await import("../usage.service");
    await incrementUsage("t1", UsageMetricType.AUTOMATIONS);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_metricType_period: {
            tenantId: "t1",
            metricType: UsageMetricType.AUTOMATIONS,
            period: "2025-03",
          },
        },
      })
    );
  });

  it("getUsage retorna messagesSent para MESSAGES", async () => {
    mockGetUsageByPeriod.mockResolvedValue({ messagesSent: 50, aiResponses: 0 });
    const { getUsage } = await import("../usage.service");
    const v = await getUsage("t1", UsageMetricType.MESSAGES);
    expect(v).toBe(50);
  });

  it("checkLimit retorna ok quando dentro do limite", async () => {
    mockGetTenantPlan.mockResolvedValue("FREE");
    mockGetUsageByPeriod.mockResolvedValue({ messagesSent: 40, aiResponses: 5 });
    mockFindUnique.mockResolvedValue({ value: 0 });
    const { checkLimit } = await import("../usage.service");
    const r = await checkLimit("t1", UsageMetricType.MESSAGES);
    expect(r.ok).toBe(true);
  });

  it("checkLimit retorna LIMIT_REACHED quando excede mensagens FREE", async () => {
    mockGetTenantPlan.mockResolvedValue("FREE");
    mockGetUsageByPeriod.mockResolvedValue({ messagesSent: 60, aiResponses: 0 });
    const { checkLimit } = await import("../usage.service");
    const r = await checkLimit("t1", UsageMetricType.MESSAGES);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("LIMIT_REACHED");
      expect(r.message).toBe("Upgrade your plan");
    }
  });

  it("checkLimit retorna ok para SCALE (ilimitado)", async () => {
    mockGetTenantPlan.mockResolvedValue("SCALE");
    const { checkLimit } = await import("../usage.service");
    const r = await checkLimit("t1", UsageMetricType.MESSAGES);
    expect(r.ok).toBe(true);
  });
});
