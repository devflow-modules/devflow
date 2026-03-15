import { describe, it, expect, beforeEach } from "vitest";
import { BillingService } from "../BillingService";
import { Plans } from "../plans";

describe("BillingService", () => {
  const userId = "user-free";

  beforeEach(() => {
    BillingService.resetUserPlan(userId);
  });

  describe("getUserPlan", () => {
    it("retorna FREE para usuário sem plano definido", () => {
      expect(BillingService.getUserPlan(userId)).toBe("FREE");
    });

    it("retorna plano definido após setUserPlan", () => {
      BillingService.setUserPlan(userId, "PRO");
      expect(BillingService.getUserPlan(userId)).toBe("PRO");
    });
  });

  describe("checkLimit", () => {
    it("FREE: permite 0 regras (limite 3)", () => {
      expect(BillingService.checkLimit(userId, "rules", 0)).toBe(true);
      expect(BillingService.checkLimit(userId, "rules", 1)).toBe(true);
      expect(BillingService.checkLimit(userId, "rules", 2)).toBe(true);
    });

    it("FREE: bloqueia ao atingir 3 regras", () => {
      expect(BillingService.checkLimit(userId, "rules", 3)).toBe(false);
      expect(BillingService.checkLimit(userId, "rules", 4)).toBe(false);
    });

    it("FREE: permite 0 casas (limite 1)", () => {
      expect(BillingService.checkLimit(userId, "households", 0)).toBe(true);
    });

    it("FREE: bloqueia ao atingir 1 casa", () => {
      expect(BillingService.checkLimit(userId, "households", 1)).toBe(false);
    });

    it("PRO: permite até 50 regras e 5 casas", () => {
      BillingService.setUserPlan(userId, "PRO");
      expect(BillingService.checkLimit(userId, "rules", 49)).toBe(true);
      expect(BillingService.checkLimit(userId, "rules", 50)).toBe(false);
      expect(BillingService.checkLimit(userId, "households", 4)).toBe(true);
      expect(BillingService.checkLimit(userId, "households", 5)).toBe(false);
    });
  });

  describe("checkFeature", () => {
    it("FREE: não tem advancedRules, exports, analytics", () => {
      expect(BillingService.checkFeature(userId, "advancedRules")).toBe(false);
      expect(BillingService.checkFeature(userId, "exports")).toBe(false);
      expect(BillingService.checkFeature(userId, "analytics")).toBe(false);
    });

    it("PRO: tem todas as features", () => {
      BillingService.setUserPlan(userId, "PRO");
      expect(BillingService.checkFeature(userId, "advancedRules")).toBe(true);
      expect(BillingService.checkFeature(userId, "exports")).toBe(true);
      expect(BillingService.checkFeature(userId, "analytics")).toBe(true);
    });

    it("TEAM: tem todas as features", () => {
      BillingService.setUserPlan(userId, "TEAM");
      expect(BillingService.checkFeature(userId, "analytics")).toBe(true);
    });
  });

  describe("getLimit", () => {
    it("retorna limite correto para FREE", () => {
      expect(BillingService.getLimit(userId, "rules")).toBe(Plans.FREE.maxRules);
      expect(BillingService.getLimit(userId, "households")).toBe(Plans.FREE.maxHouseholds);
    });

    it("retorna limite correto para PRO", () => {
      BillingService.setUserPlan(userId, "PRO");
      expect(BillingService.getLimit(userId, "rules")).toBe(Plans.PRO.maxRules);
      expect(BillingService.getLimit(userId, "households")).toBe(Plans.PRO.maxHouseholds);
    });
  });
});
