import { describe, it, expect, vi } from "vitest";
import { WaAutoReplyClaimStatus, WaAutoReplyClaimTrigger } from "@/generated/prisma-whatsapp";

describe("listWaAutoReplyClaimsForAdmin", () => {
  it("aplica filtros e ordenação desc", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "a" }]);
    const count = vi.fn().mockResolvedValue(1);
    const prisma = { waAutoReplyClaim: { findMany, count } };
    const { listWaAutoReplyClaimsForAdmin } = await import(
      "../automaticReplyClaimDiagnosticsService"
    );
    const createdFrom = new Date("2026-01-01");
    const createdTo = new Date("2026-12-31");
    const r = await listWaAutoReplyClaimsForAdmin(prisma as never, {
      tenantId: "t1",
      threadId: "th1",
      inboundWaMessageId: "w1",
      triggerSource: WaAutoReplyClaimTrigger.AI,
      status: WaAutoReplyClaimStatus.FAILED,
      createdFrom,
      createdTo,
      skip: 10,
      take: 20,
    });
    expect(r.total).toBe(1);
    expect(r.items).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "t1",
          waInboxThreadId: "th1",
          inboundWaMessageId: "w1",
          triggerSource: WaAutoReplyClaimTrigger.AI,
          status: WaAutoReplyClaimStatus.FAILED,
          createdAt: { gte: createdFrom, lte: createdTo },
        }),
        orderBy: { createdAt: "desc" },
        skip: 10,
        take: 20,
      })
    );
  });
});
