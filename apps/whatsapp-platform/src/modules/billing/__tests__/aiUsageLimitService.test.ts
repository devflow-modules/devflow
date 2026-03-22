import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetTenantPlan = vi.fn();
const mockGetAiUsageMetrics = vi.fn();

vi.mock("../subscriptionService", () => ({
  getTenantPlan: (...a: unknown[]) => mockGetTenantPlan(...a),
}));
vi.mock("@/modules/ai/aiUsageService", () => ({
  getAiUsageMetrics: (...a: unknown[]) => mockGetAiUsageMetrics(...a),
  periodYYYYMM: () => "2025-03",
}));

describe("aiUsageLimitService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenantPlan.mockResolvedValue("STARTER");
    mockGetAiUsageMetrics.mockResolvedValue({
      aiMessagesTotal: 50,
      messagesTotal: 100,
      fallbackTotal: 5,
      tokensUsedTotal: 5000,
      estimatedCostUsd: 0.5,
    });
  });

  it("getAiUsageStatus retorna canUse quando dentro do limite", async () => {
    vi.doMock("./planConfig", () => ({
      getPlanLimits: () => ({ aiResponsesPerMonth: 100 }),
    }));
    const { getAiUsageStatus } = await import("../aiUsageLimitService");
    const status = await getAiUsageStatus("t1");
    expect(status.used).toBe(50);
    expect(status.canUse).toBe(true);
    expect(status.shouldFallbackToLegacy).toBe(false);
    expect(status.percentUsed).toBe(50);
  });

  it("getAiUsageStatus retorna shouldFallbackToLegacy quando excedeu", async () => {
    mockGetAiUsageMetrics.mockResolvedValue({
      aiMessagesTotal: 150,
      messagesTotal: 200,
      fallbackTotal: 10,
      tokensUsedTotal: 15000,
      estimatedCostUsd: 1.5,
    });
    const { getAiUsageStatus } = await import("../aiUsageLimitService");
    const status = await getAiUsageStatus("t1");
    expect(status.used).toBe(150);
    expect(status.limit).toBe(100); // STARTER
    expect(status.canUse).toBe(false);
    expect(status.shouldFallbackToLegacy).toBe(true);
  });

  it("getAiPlanInfo retorna info do plano", async () => {
    const { getAiPlanInfo } = await import("../aiUsageLimitService");
    const info = await getAiPlanInfo("t1");
    expect(info.plan).toBe("STARTER");
    expect(info.planName).toBe("Starter");
    expect(info.aiLimit).toBe(100);
    expect(info.aiLimitLabel).toContain("100");
  });
});
