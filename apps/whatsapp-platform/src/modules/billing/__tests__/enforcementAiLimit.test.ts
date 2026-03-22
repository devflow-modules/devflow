import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetTenantPlan = vi.fn();
const mockGetAiUsageMetrics = vi.fn();
const mockGetUsageByPeriod = vi.fn();

vi.mock("../subscriptionService", () => ({
  getTenantPlan: (...a: unknown[]) => mockGetTenantPlan(...a),
}));
vi.mock("./planCapabilities", () => ({
  getTenantPlanCapabilities: (plan: string) => ({
    plan,
    maxMessages: 1000,
    maxAIUsage: 100,
    maxAutomations: null,
    maxUsers: null,
    maxPhoneNumbers: null,
    featuresEnabled: {},
  }),
}));
vi.mock("@/modules/ai/aiUsageService", () => ({
  getAiUsageMetrics: (...a: unknown[]) => mockGetAiUsageMetrics(...a),
}));
vi.mock("../usageService", () => ({
  getUsageByPeriod: (...a: unknown[]) => mockGetUsageByPeriod(...a),
  periodYYYYMM: () => "2025-03",
}));
vi.mock("./planConfig", () => ({
  isBillingEnforceLimits: () => true,
}));
vi.mock("../billingObserverService", () => ({
  logLimitExceeded: () => {},
  logUsageThresholdWarning: () => {},
}));

describe("enforcementService AI limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenantPlan.mockResolvedValue("STARTER");
    mockGetAiUsageMetrics.mockResolvedValue({ aiMessagesTotal: 50 });
    mockGetUsageByPeriod.mockResolvedValue({ messagesSent: 100, aiResponses: 50 });
  });

  it("permite quando dentro do limite de IA", async () => {
    const { enforceUsageOrThrow } = await import("../enforcementService");
    await expect(
      enforceUsageOrThrow({ tenantId: "t1", feature: "ai", quantity: 1 })
    ).resolves.toBeUndefined();
  });

  it("lança quando excede limite de IA (Starter)", async () => {
    mockGetAiUsageMetrics.mockResolvedValue({ aiMessagesTotal: 100 });
    const { enforceUsageOrThrow, UsageLimitExceededError } =
      await import("../enforcementService");
    await expect(
      enforceUsageOrThrow({ tenantId: "t1", feature: "ai", quantity: 1 })
    ).rejects.toThrow(UsageLimitExceededError);
  });

  it("permite excedente de IA no Pro (será cobrado via meter events)", async () => {
    mockGetTenantPlan.mockResolvedValue("PRO");
    mockGetAiUsageMetrics.mockResolvedValue({ aiMessagesTotal: 750 });
    const { enforceUsageOrThrow } = await import("../enforcementService");
    await expect(
      enforceUsageOrThrow({ tenantId: "t1", feature: "ai", quantity: 1 })
    ).resolves.toBeUndefined();
  });
});
