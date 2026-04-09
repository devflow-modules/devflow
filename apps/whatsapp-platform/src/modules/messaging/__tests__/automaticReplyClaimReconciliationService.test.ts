import { describe, it, expect, vi, beforeEach } from "vitest";
import { WaAutoReplyClaimStatus } from "@/generated/prisma-whatsapp";

vi.mock("@/lib/observability", () => ({
  logEvent: vi.fn(),
}));

describe("expirePendingClaimsPastTtl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marca PENDING expirados como EXPIRED", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 3 });
    const prisma = { waAutoReplyClaim: { updateMany } };
    const { expirePendingClaimsPastTtl } = await import(
      "../automaticReplyClaimReconciliationService"
    );
    const now = new Date("2026-06-01T12:00:00Z");
    const r = await expirePendingClaimsPastTtl(prisma as never, now);
    expect(r.expiredCount).toBe(3);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        status: WaAutoReplyClaimStatus.PENDING,
        expiresAt: { lt: now },
      },
      data: {
        status: WaAutoReplyClaimStatus.EXPIRED,
        failureReason: "claim_expired",
      },
    });
  });
});

describe("attemptRepairClaimFromOutboundEvidence", () => {
  it("não altera claim já SENT", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: "c1",
      tenantId: "t1",
      waInboxThreadId: "th1",
      inboundWaMessageId: "in1",
      status: WaAutoReplyClaimStatus.SENT,
      outboundWaMessageId: "out1",
    });
    const prisma = { waAutoReplyClaim: { findUnique } };
    const { attemptRepairClaimFromOutboundEvidence } = await import(
      "../automaticReplyClaimReconciliationService"
    );
    const r = await attemptRepairClaimFromOutboundEvidence(prisma as never, "c1");
    expect(r).toEqual({ ok: true, repaired: false, reason: "already_sent" });
  });
});
