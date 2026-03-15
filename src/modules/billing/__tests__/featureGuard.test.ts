import { describe, it, expect, beforeEach } from "vitest";
import { requireFeature } from "../featureGuard";
import { BillingService } from "../BillingService";

describe("featureGuard", () => {
  const userId = "user-1";

  beforeEach(() => {
    BillingService.resetUserPlan(userId);
  });

  it("retorna null quando usuário tem acesso à feature", () => {
    BillingService.setUserPlan(userId, "PRO");
    expect(requireFeature(userId, "analytics")).toBeNull();
    expect(requireFeature(userId, "exports")).toBeNull();
  });

  it("retorna erro feature_not_available quando usuário FREE tenta analytics", () => {
    const result = requireFeature(userId, "analytics");
    expect(result).not.toBeNull();
    expect(result).toEqual({ error: "feature_not_available", planRequired: "PRO" });
  });

  it("retorna erro para exports quando FREE", () => {
    const result = requireFeature(userId, "exports");
    expect(result?.error).toBe("feature_not_available");
    expect(result?.planRequired).toBe("PRO");
  });

  it("retorna erro para advancedRules quando FREE", () => {
    const result = requireFeature(userId, "advancedRules");
    expect(result?.error).toBe("feature_not_available");
    expect(result?.planRequired).toBe("PRO");
  });
});
