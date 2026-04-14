import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetTenantPlan = vi.fn();
vi.mock("../subscriptionService", () => ({
  getTenantPlan: (...args: unknown[]) => mockGetTenantPlan(...args),
}));

describe("featureGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("canUseFeature retorna true quando plano inclui feature", async () => {
    mockGetTenantPlan.mockResolvedValue("PRO");
    const { canUseFeature } = await import("../featureGate");
    const ok = await canUseFeature("t1", "AUTOMATION");
    expect(ok).toBe(true);
  });

  it("canUseFeature retorna false quando plano FREE e feature AUTOMATION", async () => {
    mockGetTenantPlan.mockResolvedValue("FREE");
    const { canUseFeature } = await import("../featureGate");
    const ok = await canUseFeature("t1", "AUTOMATION");
    expect(ok).toBe(false);
  });

  it("assertFeature lança FeatureNotAvailableError com code FEATURE_NOT_AVAILABLE quando bloqueado", async () => {
    mockGetTenantPlan.mockResolvedValue("FREE");
    const { assertFeature } = await import("../featureGate");
    const { FeatureNotAvailableError } = await import("../featureAccess");
    await expect(assertFeature("t1", "AUTOMATION")).rejects.toBeInstanceOf(FeatureNotAvailableError);
  });

  it("assertFeature não lança quando permitido", async () => {
    mockGetTenantPlan.mockResolvedValue("SCALE");
    const { assertFeature } = await import("../featureGate");
    await expect(assertFeature("t1", "ADVANCED_AUTOMATION")).resolves.toBeUndefined();
  });
});
