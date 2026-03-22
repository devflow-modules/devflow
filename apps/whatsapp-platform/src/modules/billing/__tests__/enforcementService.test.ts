import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetUsageByPeriod = vi.fn();
const mockGetAiUsageMetrics = vi.fn();
const mockIsBillingEnforceLimits = vi.fn();

vi.mock("@/modules/ai/aiUsageService", () => ({
  getAiUsageMetrics: (...args: unknown[]) => mockGetAiUsageMetrics(...args),
}));

vi.mock("../subscriptionService", () => ({
  getTenantPlan: () => Promise.resolve("PRO"),
}));

vi.mock("../planCapabilities", () => ({
  getTenantPlanCapabilities: (plan: string) => ({
    plan: plan || "PRO",
    maxMessages: 5000,
    maxAIUsage: 750,
    maxAutomations: 50,
    maxUsers: 3,
    maxPhoneNumbers: 1,
    featuresEnabled: {},
  }),
}));

vi.mock("../usageService", () => ({
  getUsageByPeriod: (...args: unknown[]) => mockGetUsageByPeriod(...args),
  periodYYYYMM: () => "2025-03",
}));

vi.mock("../planConfig", () => ({
  isBillingEnforceLimits: () => mockIsBillingEnforceLimits(),
}));

vi.mock("../billingObserverService", () => ({
  logLimitExceeded: () => {},
  logUsageThresholdWarning: () => {},
}));

describe("enforcementService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsBillingEnforceLimits.mockReturnValue(true);
    mockGetAiUsageMetrics.mockResolvedValue({ aiMessagesTotal: 50 });
  });

  afterEach(() => {
    vi.unstubAllEnvs?.();
  });

  it("permite quando dentro do limite", async () => {
    mockGetUsageByPeriod.mockResolvedValue({
      period: "2025-03",
      messagesSent: 100,
      aiResponses: 50,
    });

    const { enforceUsageOrThrow } = await import("../enforcementService");

    await expect(
      enforceUsageOrThrow({ tenantId: "t1", feature: "messages", quantity: 1 })
    ).resolves.toBeUndefined();

    await expect(
      enforceUsageOrThrow({ tenantId: "t1", feature: "ai", quantity: 1 })
    ).resolves.toBeUndefined();
  });

  it("lança UsageLimitExceededError quando excede e BILLING_ENFORCE_LIMITS=true", async () => {
    mockGetUsageByPeriod.mockResolvedValue({
      period: "2025-03",
      messagesSent: 5000,
      aiResponses: 0,
    });
    mockIsBillingEnforceLimits.mockReturnValue(true);

    const { enforceUsageOrThrow, UsageLimitExceededError } = await import(
      "../enforcementService"
    );

    const err = await enforceUsageOrThrow({
      tenantId: "t1",
      feature: "messages",
      quantity: 1,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(UsageLimitExceededError);
    expect(err.code).toBe("USAGE_LIMIT_EXCEEDED");
    expect(err.feature).toBe("messages");
  });

  it("permite quando excede mas BILLING_ENFORCE_LIMITS=false (soft limit)", async () => {
    mockGetUsageByPeriod.mockResolvedValue({
      period: "2025-03",
      messagesSent: 5000,
      aiResponses: 750,
    });
    mockGetAiUsageMetrics.mockResolvedValue({ aiMessagesTotal: 750 });
    mockIsBillingEnforceLimits.mockReturnValue(false);

    const { enforceUsageOrThrow } = await import("../enforcementService");

    await expect(
      enforceUsageOrThrow({ tenantId: "t1", feature: "messages", quantity: 1 })
    ).resolves.toBeUndefined();

    await expect(
      enforceUsageOrThrow({ tenantId: "t1", feature: "ai", quantity: 1 })
    ).resolves.toBeUndefined();
  });

  it("UsageLimitExceededError tem code e feature", async () => {
    const { UsageLimitExceededError } = await import("../enforcementService");
    const err = new UsageLimitExceededError("ai", "Limite IA atingido");
    expect(err.code).toBe("USAGE_LIMIT_EXCEEDED");
    expect(err.feature).toBe("ai");
    expect(err.message).toContain("Limite IA");
  });
});
