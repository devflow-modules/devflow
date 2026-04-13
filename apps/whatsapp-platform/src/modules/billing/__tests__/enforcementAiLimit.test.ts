import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetTenantBillingContext = vi.fn();
const mockGetAiUsageMetrics = vi.fn();
const mockGetUsageByPeriod = vi.fn();

function capsForPlan(plan: "STARTER" | "PRO") {
  return {
    plan,
    maxMessages: 1000,
    maxAIUsage: 100,
    maxAutomations: null as number | null,
    maxUsers: null as number | null,
    maxPhoneNumbers: null as number | null,
    featuresEnabled: {},
  };
}

vi.mock("../subscriptionService", () => ({
  getTenantBillingContext: (...a: unknown[]) => mockGetTenantBillingContext(...a),
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
    mockGetTenantBillingContext.mockResolvedValue({
      plan: "STARTER",
      capabilities: capsForPlan("STARTER"),
    });
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
    mockGetTenantBillingContext.mockResolvedValue({
      plan: "PRO",
      capabilities: capsForPlan("PRO"),
    });
    mockGetAiUsageMetrics.mockResolvedValue({ aiMessagesTotal: 750 });
    const { enforceUsageOrThrow } = await import("../enforcementService");
    await expect(
      enforceUsageOrThrow({ tenantId: "t1", feature: "ai", quantity: 1 })
    ).resolves.toBeUndefined();
  });
});
