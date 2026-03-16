import { describe, it, expect, beforeEach, vi } from "vitest";
import { BillingService } from "../BillingService";
import { Plans } from "../plans";
import * as BillingRepository from "../BillingRepository";

vi.mock("../BillingRepository", () => ({
  getUserPlan: vi.fn(),
  setUserPlan: vi.fn(),
}));

describe("BillingService", () => {
  const userId = "user-free";

  beforeEach(() => {
    vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("FREE");
    vi.mocked(BillingRepository.setUserPlan).mockResolvedValue(undefined);
  });

  describe("getUserPlan", () => {
    it("retorna FREE para usuário sem plano definido", async () => {
      vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("FREE");
      await expect(BillingService.getUserPlan(userId)).resolves.toBe("FREE");
    });

    it("retorna plano definido após setUserPlan", async () => {
      vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("PRO");
      await BillingService.setUserPlan(userId, "PRO");
      expect(await BillingService.getUserPlan(userId)).toBe("PRO");
    });
  });

  describe("checkLimit", () => {
    it("FREE: permite 0 regras (limite 3)", async () => {
      vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("FREE");
      expect(await BillingService.checkLimit(userId, "rules", 0)).toBe(true);
      expect(await BillingService.checkLimit(userId, "rules", 1)).toBe(true);
      expect(await BillingService.checkLimit(userId, "rules", 2)).toBe(true);
    });

    it("FREE: bloqueia ao atingir 3 regras", async () => {
      vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("FREE");
      expect(await BillingService.checkLimit(userId, "rules", 3)).toBe(false);
      expect(await BillingService.checkLimit(userId, "rules", 4)).toBe(false);
    });

    it("FREE: permite 0 casas (limite 1)", async () => {
      vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("FREE");
      expect(await BillingService.checkLimit(userId, "households", 0)).toBe(true);
    });

    it("FREE: bloqueia ao atingir 1 casa", async () => {
      vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("FREE");
      expect(await BillingService.checkLimit(userId, "households", 1)).toBe(false);
    });

    it("PRO: permite até 50 regras e 5 casas", async () => {
      vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("PRO");
      expect(await BillingService.checkLimit(userId, "rules", 49)).toBe(true);
      expect(await BillingService.checkLimit(userId, "rules", 50)).toBe(false);
      expect(await BillingService.checkLimit(userId, "households", 4)).toBe(true);
      expect(await BillingService.checkLimit(userId, "households", 5)).toBe(false);
    });
  });

  describe("checkFeature", () => {
    it("FREE: não tem advancedRules, exports, analytics", async () => {
      vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("FREE");
      expect(await BillingService.checkFeature(userId, "advancedRules")).toBe(false);
      expect(await BillingService.checkFeature(userId, "exports")).toBe(false);
      expect(await BillingService.checkFeature(userId, "analytics")).toBe(false);
    });

    it("PRO: tem todas as features", async () => {
      vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("PRO");
      expect(await BillingService.checkFeature(userId, "advancedRules")).toBe(true);
      expect(await BillingService.checkFeature(userId, "exports")).toBe(true);
      expect(await BillingService.checkFeature(userId, "analytics")).toBe(true);
    });

    it("TEAM: tem todas as features", async () => {
      vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("TEAM");
      expect(await BillingService.checkFeature(userId, "analytics")).toBe(true);
    });
  });

  describe("getLimit", () => {
    it("retorna limite correto para FREE", async () => {
      vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("FREE");
      expect(await BillingService.getLimit(userId, "rules")).toBe(Plans.FREE.maxRules);
      expect(await BillingService.getLimit(userId, "households")).toBe(Plans.FREE.maxHouseholds);
    });

    it("retorna limite correto para PRO", async () => {
      vi.mocked(BillingRepository.getUserPlan).mockResolvedValue("PRO");
      expect(await BillingService.getLimit(userId, "rules")).toBe(Plans.PRO.maxRules);
      expect(await BillingService.getLimit(userId, "households")).toBe(Plans.PRO.maxHouseholds);
    });
  });
});
