import { describe, it, expect, beforeEach, vi } from "vitest";
import * as BillingRepository from "../BillingRepository";
import { prisma } from "@/modules/financeiro/lib/db";

vi.mock("@/modules/financeiro/lib/db", () => ({
  prisma: {
    userPlan: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe("BillingRepository", () => {
  const userId = "user-1";

  beforeEach(() => {
    vi.mocked(prisma.userPlan.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.userPlan.upsert).mockResolvedValue({
      id: "plan-1",
      userId,
      planId: "PRO",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe("getUserPlan", () => {
    it("retorna FREE quando não existe registro", async () => {
      vi.mocked(prisma.userPlan.findUnique).mockResolvedValue(null);
      await expect(BillingRepository.getUserPlan(userId)).resolves.toBe("FREE");
    });

    it("retorna planId quando existe registro", async () => {
      vi.mocked(prisma.userPlan.findUnique).mockResolvedValue({
        id: "plan-1",
        userId,
        planId: "PRO",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await expect(BillingRepository.getUserPlan(userId)).resolves.toBe("PRO");
    });

    it("retorna FREE para planId inválido no banco", async () => {
      vi.mocked(prisma.userPlan.findUnique).mockResolvedValue({
        id: "plan-1",
        userId,
        planId: "INVALID",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await expect(BillingRepository.getUserPlan(userId)).resolves.toBe("FREE");
    });
  });

  describe("setUserPlan", () => {
    it("chama upsert com userId e planId", async () => {
      await BillingRepository.setUserPlan(userId, "TEAM");
      expect(prisma.userPlan.upsert).toHaveBeenCalledWith({
        where: { userId },
        create: { userId, planId: "TEAM" },
        update: { planId: "TEAM", updatedAt: expect.any(Date) },
      });
    });
  });
});
