import { describe, it, expect, beforeEach, vi } from "vitest";
import * as BillingProfileRepository from "../BillingProfileRepository";
import { prisma } from "@/lib/prisma-root";

vi.mock("@/lib/prisma-root", () => ({
  prisma: {
    userBillingProfile: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

const makeProfile = (overrides = {}) => ({
  id: "bp-1",
  userId: "user-1",
  stripeCustomerId: "cus_123",
  stripeSubscriptionId: "sub_456",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("BillingProfileRepository", () => {
  const userId = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // getByUserId
  // -------------------------------------------------------------------------
  describe("getByUserId", () => {
    it("retorna null quando não há perfil", async () => {
      vi.mocked(prisma.userBillingProfile.findUnique).mockResolvedValue(null);
      await expect(BillingProfileRepository.getByUserId(userId)).resolves.toBeNull();
    });

    it("retorna o perfil quando existe", async () => {
      const profile = makeProfile();
      vi.mocked(prisma.userBillingProfile.findUnique).mockResolvedValue(profile);
      await expect(BillingProfileRepository.getByUserId(userId)).resolves.toEqual(profile);
    });
  });

  // -------------------------------------------------------------------------
  // upsertProfile
  // -------------------------------------------------------------------------
  describe("upsertProfile", () => {
    it("chama upsert com userId e stripeCustomerId", async () => {
      const profile = makeProfile();
      vi.mocked(prisma.userBillingProfile.upsert).mockResolvedValue(profile);

      await BillingProfileRepository.upsertProfile(userId, "cus_123");

      expect(prisma.userBillingProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        create: { userId, stripeCustomerId: "cus_123", stripeSubscriptionId: null },
        update: expect.objectContaining({ stripeCustomerId: "cus_123" }),
      });
    });

    it("inclui stripeSubscriptionId quando fornecido", async () => {
      const profile = makeProfile();
      vi.mocked(prisma.userBillingProfile.upsert).mockResolvedValue(profile);

      await BillingProfileRepository.upsertProfile(userId, "cus_123", "sub_456");

      expect(prisma.userBillingProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { userId, stripeCustomerId: "cus_123", stripeSubscriptionId: "sub_456" },
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // updateSubscriptionId
  // -------------------------------------------------------------------------
  describe("updateSubscriptionId", () => {
    it("chama updateMany com novo subscriptionId", async () => {
      vi.mocked(prisma.userBillingProfile.updateMany).mockResolvedValue({ count: 1 });

      await BillingProfileRepository.updateSubscriptionId(userId, "sub_789");

      expect(prisma.userBillingProfile.updateMany).toHaveBeenCalledWith({
        where: { userId },
        data: { stripeSubscriptionId: "sub_789", updatedAt: expect.any(Date) },
      });
    });
  });

  // -------------------------------------------------------------------------
  // clearSubscriptionId
  // -------------------------------------------------------------------------
  describe("clearSubscriptionId", () => {
    it("define stripeSubscriptionId como null", async () => {
      vi.mocked(prisma.userBillingProfile.updateMany).mockResolvedValue({ count: 1 });

      await BillingProfileRepository.clearSubscriptionId(userId);

      expect(prisma.userBillingProfile.updateMany).toHaveBeenCalledWith({
        where: { userId },
        data: { stripeSubscriptionId: null, updatedAt: expect.any(Date) },
      });
    });
  });
});
