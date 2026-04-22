import { describe, it, expect, vi, beforeEach } from "vitest";
import { MetaBusinessVerificationStatus } from "@/generated/prisma-whatsapp";

const logChannelEvent = vi.fn();
const findUnique = vi.fn();
const update = vi.fn();

vi.mock("@/modules/whatsapp/channelEventService", () => ({
  logChannelEvent: (...args: unknown[]) => logChannelEvent(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    whatsappPhoneNumber: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => update(...args),
    },
  },
}));

describe("P0 — verificationService timeline (logChannelEvent)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    update.mockResolvedValue({});
  });

  it("setVerificationStatus (approve) emite VERIFICATION_STATUS_CHANGED", async () => {
    const checklist = {
      items: [
        { id: "business_profile", label: "x", done: true },
        { id: "domain_or_website", label: "x", done: true },
        { id: "legal_docs", label: "x", done: true },
        { id: "phone_match", label: "x", done: true },
        { id: "two_factor", label: "x", done: true },
      ],
    };
    const afterRow = {
      id: "c1",
      verificationStatus: MetaBusinessVerificationStatus.APPROVED,
      verificationChecklist: checklist,
      verificationChecklistUpdatedAt: null,
      verificationReadyAt: new Date(),
      verificationSubmittedAt: new Date(),
      verificationApprovedAt: new Date(),
      verificationRejectedAt: null,
    };

    findUnique
      .mockResolvedValueOnce({
        verificationStatus: MetaBusinessVerificationStatus.IN_REVIEW,
        verificationChecklist: checklist,
      })
      .mockResolvedValueOnce(afterRow);

    const { setVerificationStatus } = await import("../verificationService");
    await setVerificationStatus("c1", "approve");

    expect(logChannelEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        channelId: "c1",
        type: "VERIFICATION_STATUS_CHANGED",
        message: expect.stringContaining("aprovada"),
        metadata: expect.objectContaining({
          action: "approve",
          from: MetaBusinessVerificationStatus.IN_REVIEW,
          to: MetaBusinessVerificationStatus.APPROVED,
        }),
      })
    );
  });
});
