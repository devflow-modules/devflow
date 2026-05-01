import { describe, it, expect, vi, beforeEach } from "vitest";
import { clearDealSuggestion, suggestInboxThreadDeal } from "../suggestDealService";
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

describe("suggestInboxThreadDeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("operador/manager pode sugerir ganho com valor", async () => {
    vi.mocked(prisma.waInboxThread.findFirst).mockResolvedValue({ dealStatus: null } as never);
    vi.mocked(prisma.waInboxThread.update).mockResolvedValue({} as never);
    const r = await suggestInboxThreadDeal({
      tenantId: "t",
      threadId: "th",
      userId: "u1",
      status: "won",
      value: 99,
    });
    expect(r).toEqual({ ok: true });
    expect(prisma.waInboxThread.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "th", tenantId: "t" },
        data: expect.objectContaining({
          dealSuggested: true,
          dealSuggestedBy: "u1",
          dealSuggestedStatus: "won",
          dealSuggestedValue: 99,
        }),
      })
    );
    expect(logAction).toHaveBeenCalledWith("t", "th", "u1", "deal_suggest", expect.objectContaining({ status: "won" }));
  });

  it("sugestão de perda exige lostReason válido", async () => {
    vi.mocked(prisma.waInboxThread.findFirst).mockResolvedValue({ dealStatus: null } as never);
    const r = await suggestInboxThreadDeal({
      tenantId: "t",
      threadId: "th",
      userId: "u1",
      status: "lost",
      lostReason: "invalid",
    });
    expect(r).toEqual({ ok: false, code: "INVALID_LOST_REASON" });
    expect(prisma.waInboxThread.update).not.toHaveBeenCalled();
  });

  it("sugestão de perda grava motivo", async () => {
    vi.mocked(prisma.waInboxThread.findFirst).mockResolvedValue({ dealStatus: null } as never);
    vi.mocked(prisma.waInboxThread.update).mockResolvedValue({} as never);
    const r = await suggestInboxThreadDeal({
      tenantId: "t",
      threadId: "th",
      userId: "u1",
      status: "lost",
      lostReason: "preco",
    });
    expect(r).toEqual({ ok: true });
    expect(prisma.waInboxThread.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dealSuggestedStatus: "lost",
          dealSuggestedLostReason: "preco",
          dealSuggestedValue: null,
        }),
      })
    );
  });
});

describe("clearDealSuggestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("limpa campos de sugestão", async () => {
    vi.mocked(prisma.waInboxThread.findFirst).mockResolvedValue({ id: "th" } as never);
    vi.mocked(prisma.waInboxThread.update).mockResolvedValue({} as never);
    const r = await clearDealSuggestion({ tenantId: "t", threadId: "th", userId: "mgr" });
    expect(r).toEqual({ ok: true });
    expect(prisma.waInboxThread.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dealSuggested: false,
          dealSuggestedStatus: null,
          dealSuggestedValue: null,
          dealSuggestedLostReason: null,
        }),
      })
    );
    expect(logAction).toHaveBeenCalledWith("t", "th", "mgr", "deal_suggestion_clear", {});
  });
});
