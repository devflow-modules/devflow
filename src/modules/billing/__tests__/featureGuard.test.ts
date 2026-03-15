import { describe, it, expect, beforeEach, vi } from "vitest";
import { requireFeature } from "../featureGuard";
import * as BillingRepository from "../BillingRepository";

vi.mock("../BillingRepository", () => ({
  getUserPlan: vi.fn(),
  setUserPlan: vi.fn(),
}));

describe("featureGuard", () => {
  const userId = "user-1";

  beforeEach(() => {
    vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("FREE");
    vi.mocked(BillingRepository.setUserPlan).mockResolvedValue(undefined);
  });

  it("retorna null quando usuário tem acesso à feature", async () => {
    vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("PRO");
    await expect(requireFeature(userId, "analytics")).resolves.toBeNull();
    await expect(requireFeature(userId, "exports")).resolves.toBeNull();
  });

  it("retorna erro feature_not_available quando usuário FREE tenta analytics", async () => {
    vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("FREE");
    const result = await requireFeature(userId, "analytics");
    expect(result).not.toBeNull();
    expect(result).toEqual({ error: "feature_not_available", planRequired: "PRO" });
  });

  it("retorna erro para exports quando FREE", async () => {
    vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("FREE");
    const result = await requireFeature(userId, "exports");
    expect(result?.error).toBe("feature_not_available");
    expect(result?.planRequired).toBe("PRO");
  });

  it("retorna erro para advancedRules quando FREE", async () => {
    vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("FREE");
    const result = await requireFeature(userId, "advancedRules");
    expect(result?.error).toBe("feature_not_available");
    expect(result?.planRequired).toBe("PRO");
  });
});
