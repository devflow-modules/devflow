import { describe, it, expect, vi, beforeEach } from "vitest";
import { closeInboxThreadDeal } from "../threadDealService";
import { logAction } from "../auditService";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    waInboxThread: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../auditService", () => ({
  logAction: vi.fn(),
}));

import { prisma } from "@/lib/prisma";

describe("closeInboxThreadDeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recusa se já fechado", async () => {
    vi.mocked(prisma.waInboxThread.findFirst).mockResolvedValue({ dealStatus: "won" } as never);
    const r = await closeInboxThreadDeal({
      tenantId: "t",
      threadId: "th",
      userId: "u",
      status: "lost",
      value: undefined,
      currency: "BRL",
    });
    expect(r).toEqual({ ok: false, code: "ALREADY_CLOSED" });
    expect(prisma.waInboxThread.update).not.toHaveBeenCalled();
  });

  it("ganha venda com valor e regista auditoria", async () => {
    vi.mocked(prisma.waInboxThread.findFirst).mockResolvedValue({ dealStatus: null } as never);
    vi.mocked(prisma.waInboxThread.update).mockResolvedValue({} as never);
    const r = await closeInboxThreadDeal({
      tenantId: "t",
      threadId: "th",
      userId: "u",
      status: "won",
      value: 300,
      currency: "brl",
    });
    expect(r).toEqual({ ok: true });
    expect(prisma.waInboxThread.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "th", tenantId: "t" },
        data: expect.objectContaining({
          dealStatus: "won",
          dealValue: 300,
          dealCurrency: "BRL",
        }),
      })
    );
    expect(logAction).toHaveBeenCalledWith("t", "th", "u", "deal_close", expect.any(Object));
    const updateCall = vi.mocked(prisma.waInboxThread.update).mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(updateCall.data.dealSuggested).toBe(false);
    expect(updateCall.data.dealSuggestedStatus).toBeNull();
  });

  it("perda exige lostReason válido", async () => {
    vi.mocked(prisma.waInboxThread.findFirst).mockResolvedValue({ dealStatus: null } as never);
    const r = await closeInboxThreadDeal({
      tenantId: "t",
      threadId: "th",
      userId: "u",
      status: "lost",
      value: undefined,
      currency: "BRL",
      lostReason: "nope",
    });
    expect(r).toEqual({ ok: false, code: "INVALID_LOST_REASON" });
    expect(prisma.waInboxThread.update).not.toHaveBeenCalled();
  });

  it("perda grava dealLostReason e limpa sugestão", async () => {
    vi.mocked(prisma.waInboxThread.findFirst).mockResolvedValue({ dealStatus: null } as never);
    vi.mocked(prisma.waInboxThread.update).mockResolvedValue({} as never);
    const r = await closeInboxThreadDeal({
      tenantId: "t",
      threadId: "th",
      userId: "u",
      status: "lost",
      value: undefined,
      currency: "BRL",
      lostReason: "sem_interesse",
    });
    expect(r).toEqual({ ok: true });
    expect(prisma.waInboxThread.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dealStatus: "lost",
          dealLostReason: "sem_interesse",
          dealSuggested: false,
          dealSuggestedLostReason: null,
        }),
      })
    );
    expect(logAction).toHaveBeenCalledWith(
      "t",
      "th",
      "u",
      "deal_close",
      expect.objectContaining({ status: "lost", lostReason: "sem_interesse" })
    );
  });
});
