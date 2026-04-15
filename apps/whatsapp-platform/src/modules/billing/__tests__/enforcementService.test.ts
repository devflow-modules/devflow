import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PLANS } from "../plans";

const mockGetUsageByPeriod = vi.fn();
const mockGetAiUsageMetrics = vi.fn();
const mockIsBillingEnforceLimits = vi.fn();
const mockIsBillingHardBlockPaidMessages = vi.fn();
const mockGetTenantBillingContext = vi.fn();

vi.mock("@/modules/ai/aiUsageService", () => ({
  getAiUsageMetrics: (...args: unknown[]) => mockGetAiUsageMetrics(...args),
}));

vi.mock("../subscriptionService", () => ({
  getTenantBillingContext: (...args: unknown[]) => mockGetTenantBillingContext(...args),
}));

vi.mock("../usageService", () => ({
  getUsageByPeriod: (...args: unknown[]) => mockGetUsageByPeriod(...args),
  periodYYYYMM: () => "2025-03",
}));

vi.mock("../planConfig", () => ({
  isBillingEnforceLimits: () => mockIsBillingEnforceLimits(),
  isBillingHardBlockPaidMessages: () => mockIsBillingHardBlockPaidMessages(),
}));

vi.mock("../billingObserverService", () => ({
  logLimitExceeded: () => {},
  logUsageThresholdWarning: () => {},
  logSoftMessageOverIncluded: () => {},
  logHighWaterMessagesCrossing5000: () => {},
}));

const paidContext = {
  plan: "OPERATIONAL_BASE" as const,
  capabilities: {
    plan: "OPERATIONAL_BASE" as const,
    maxMessages: 5000,
    maxAIUsage: 750,
    maxAutomations: 50,
    maxUsers: 3,
    maxPhoneNumbers: 1,
    featuresEnabled: PLANS.OPERATIONAL_BASE.features,
  },
};

describe("enforcementService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsBillingEnforceLimits.mockReturnValue(true);
    mockIsBillingHardBlockPaidMessages.mockReturnValue(false);
    mockGetAiUsageMetrics.mockResolvedValue({ aiMessagesTotal: 50 });
    mockGetTenantBillingContext.mockResolvedValue(paidContext);
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

  it("lança UsageLimitExceededError quando excede, enforce e hard block em mensagens (plano pago)", async () => {
    mockGetUsageByPeriod.mockResolvedValue({
      period: "2025-03",
      messagesSent: 5000,
      aiResponses: 0,
    });
    mockIsBillingEnforceLimits.mockReturnValue(true);
    mockIsBillingHardBlockPaidMessages.mockReturnValue(true);

    const { enforceUsageOrThrow, UsageLimitExceededError } = await import("../enforcementService");

    const err = await enforceUsageOrThrow({
      tenantId: "t1",
      feature: "messages",
      quantity: 1,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(UsageLimitExceededError);
    expect(err.code).toBe("USAGE_LIMIT_EXCEEDED");
    expect(err.feature).toBe("messages");
  });

  it("permite mensagens acima do incluído com soft limit (enforce sem hard block)", async () => {
    mockGetUsageByPeriod.mockResolvedValue({
      period: "2025-03",
      messagesSent: 5000,
      aiResponses: 750,
    });
    mockGetAiUsageMetrics.mockResolvedValue({ aiMessagesTotal: 750 });
    mockIsBillingEnforceLimits.mockReturnValue(true);
    mockIsBillingHardBlockPaidMessages.mockReturnValue(false);

    const { enforceUsageOrThrow } = await import("../enforcementService");

    await expect(
      enforceUsageOrThrow({ tenantId: "t1", feature: "messages", quantity: 1 })
    ).resolves.toBeUndefined();

    await expect(
      enforceUsageOrThrow({ tenantId: "t1", feature: "ai", quantity: 1 })
    ).resolves.toBeUndefined();
  });

  it("permite quando excede mas BILLING_ENFORCE_LIMITS=false (soft limit, plano pago)", async () => {
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

  it("FREE: bloqueia mensagens acima do limite mesmo com BILLING_ENFORCE_LIMITS=false", async () => {
    mockGetTenantBillingContext.mockResolvedValue({
      plan: "FREE",
      capabilities: {
        plan: "FREE",
        maxMessages: 50,
        maxAIUsage: 10,
        maxAutomations: 0,
        maxUsers: 1,
        maxPhoneNumbers: 1,
        featuresEnabled: PLANS.FREE.features,
      },
    });
    mockGetUsageByPeriod.mockResolvedValue({
      period: "2025-03",
      messagesSent: 50,
      aiResponses: 0,
    });
    mockIsBillingEnforceLimits.mockReturnValue(false);

    const { enforceUsageOrThrow, UsageLimitExceededError } = await import("../enforcementService");

    const err = await enforceUsageOrThrow({
      tenantId: "t1",
      feature: "messages",
      quantity: 1,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(UsageLimitExceededError);
    expect(err.code).toBe("FREE_PLAN_LIMIT_REACHED");
  });

  it("UsageLimitExceededError tem code e feature", async () => {
    const { UsageLimitExceededError } = await import("../enforcementService");
    const err = new UsageLimitExceededError("ai", "Limite IA atingido");
    expect(err.code).toBe("USAGE_LIMIT_EXCEEDED");
    expect(err.feature).toBe("ai");
    expect(err.message).toContain("Limite IA");
  });
});
