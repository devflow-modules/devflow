import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLeadUpdate = vi.fn();
const mockLeadCreate = vi.fn();
const mockThreadUpdate = vi.fn();

vi.mock("@/lib/whatsapp-crm-db", () => ({
  getWhatsappCrmPrisma: () => ({
    waInboxThread: {
      update: (...a: unknown[]) => mockThreadUpdate(...a),
    },
  }),
}));

vi.mock("@/lib/prisma-root", () => ({
  prisma: {
    lead: {
      update: (...a: unknown[]) => mockLeadUpdate(...a),
      create: (...a: unknown[]) => mockLeadCreate(...a),
    },
  },
}));

describe("crm-sync", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("linkLeadToThread persiste conversationRef e outboundLeadId na thread", async () => {
    mockLeadUpdate.mockResolvedValue({ id: "L1", conversationRef: "thread-1" });
    mockThreadUpdate.mockResolvedValue({});
    const { linkLeadToThread } = await import("../crm-sync");
    const row = await linkLeadToThread("L1", "thread-1");
    expect(mockLeadUpdate).toHaveBeenCalledWith({
      where: { id: "L1" },
      data: { conversationRef: "thread-1" },
    });
    expect(mockThreadUpdate).toHaveBeenCalledWith({
      where: { id: "thread-1" },
      data: { outboundLeadId: "L1" },
    });
    expect(row.conversationRef).toBe("thread-1");
  });

  it("createLeadFromConversation cria lead com origin inbound_whatsapp_thread e liga thread", async () => {
    mockLeadCreate.mockResolvedValue({ id: "L2" });
    mockThreadUpdate.mockResolvedValue({});
    const { createLeadFromConversation } = await import("../crm-sync");
    await createLeadFromConversation({
      id: "thr-9",
      tenantId: "ten-1",
      phoneNumber: "+5511999990000",
      contactName: " Ana ",
    });
    expect(mockLeadCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        phone: "+5511999990000",
        name: "Ana",
        status: "novo",
        origin: "inbound_whatsapp_thread",
        conversationRef: "thr-9",
      }),
    });
    expect(mockThreadUpdate).toHaveBeenCalledWith({
      where: { id: "thr-9" },
      data: { outboundLeadId: "L2" },
    });
  });

  it("notifyExternalCrm envia POST sem lançar", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    const { notifyExternalCrm } = await import("../crm-sync");
    const out = await notifyExternalCrm({
      webhookUrl: "https://example.com/hook",
      body: { source: "devflow_whatsapp", tenantId: "t" },
    });
    expect(out).toEqual({ ok: true, status: 204 });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/hook",
      expect.objectContaining({ method: "POST" })
    );
    fetchSpy.mockRestore();
  });
});
