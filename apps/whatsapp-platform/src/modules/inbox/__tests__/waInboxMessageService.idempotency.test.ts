import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/inbox/leadCrm", () => ({
  refreshThreadLeadCrmAfterInbound: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/modules/inbox/waInboxThreadMetrics", () => ({
  getWaInboxThreadInboxMetrics: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/modules/commercial", () => ({
  evaluateCommercialPipelineAfterInbound: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/modules/realtime/realtime.service", () => ({
  publishInboxEvent: vi.fn(),
  eventMessageCreated: vi.fn(() => ({})),
  eventConversationStatusChanged: vi.fn((_t: string, p: unknown) => ({
    type: "conversation.status_changed",
    payload: p,
  })),
}));

vi.mock("@/modules/automation", () => ({
  dispatchMessageInbound: vi.fn().mockResolvedValue(undefined),
  dispatchConversationCreated: vi.fn().mockResolvedValue(undefined),
  dispatchStatusChanged: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/observability", () => ({
  bumpMetric: vi.fn(),
}));

const findUniqueMsg = vi.fn();
const createMsg = vi.fn();
const findFirstThread = vi.fn();
const updateManyThread = vi.fn();

const mockTx = {
  waInboxMessage: {
    findUnique: (...a: unknown[]) => findUniqueMsg(...a),
    create: (...a: unknown[]) => createMsg(...a),
  },
  waInboxThread: {
    findUnique: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue({
      id: "th1",
      lastMessageAt: new Date(),
      lastMessagePreview: "preview",
      unreadCount: 1,
      lastCustomerMessageAt: new Date(),
      firstResponseAt: null,
      lastAgentReplyAt: null,
    }),
  },
  waInboxStatusHistory: {
    create: vi.fn().mockResolvedValue({}),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
    waInboxThread: {
      findFirst: (...a: unknown[]) => findFirstThread(...a),
      updateMany: (...a: unknown[]) => updateManyThread(...a),
    },
    waInboxAuditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

describe("waInboxCreateInbound idempotência", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueMsg.mockReset();
    createMsg.mockReset();
    createMsg.mockResolvedValue({
      id: "row1",
      waMessageId: "wam_dup_test",
      ts: new Date(),
      createdAt: new Date(),
      fromNumber: "5511999999999",
      toNumber: "5511888888888",
      messageType: "TEXT",
      contentText: "hi",
      status: "RECEIVED",
    });
  });

  it("não chama create na segunda entrega com o mesmo waMessageId (mensagem já existente)", async () => {
    findUniqueMsg
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "existing", waMessageId: "wam_dup_test" });
    findFirstThread.mockResolvedValue({ status: "OPEN" });

    const { waInboxCreateInbound } = await import("../waInboxMessageService");

    const parsed = {
      waMessageId: "wam_dup_test",
      from: "5511999999999",
      timestamp: "1700000000",
      type: "text",
      field: "messages",
      raw: { type: "text", text: { body: "hi" } },
    };

    await waInboxCreateInbound("tenant-a", "pnid-1", parsed);
    await waInboxCreateInbound("tenant-a", "pnid-1", parsed);

    expect(createMsg).toHaveBeenCalledTimes(1);
  });

  it("inbound em thread CLOSED reabre para OPEN após persistir a mensagem", async () => {
    findUniqueMsg.mockResolvedValue(null);
    findFirstThread.mockResolvedValue({ status: "CLOSED" });
    updateManyThread.mockResolvedValue({ count: 1 });

    const { waInboxCreateInbound } = await import("../waInboxMessageService");
    await waInboxCreateInbound("tenant-a", "pnid-1", {
      waMessageId: "wam_reopen",
      from: "5511999999999",
      timestamp: "1700000000",
      type: "text",
      field: "messages",
      raw: { type: "text", text: { body: "voltei" } },
    });

    expect(createMsg).toHaveBeenCalledTimes(1);
    expect(updateManyThread).toHaveBeenCalledWith({
      where: { id: "th1", tenantId: "tenant-a", status: "CLOSED" },
      data: { status: "OPEN" },
    });
  });

  it("inbound em thread já OPEN não chama updateMany de status", async () => {
    findUniqueMsg.mockResolvedValue(null);
    findFirstThread.mockResolvedValue({ status: "OPEN" });

    const { waInboxCreateInbound } = await import("../waInboxMessageService");
    await waInboxCreateInbound("tenant-a", "pnid-1", {
      waMessageId: "wam_open",
      from: "5511999999999",
      timestamp: "1700000000",
      type: "text",
      field: "messages",
      raw: { type: "text", text: { body: "oi" } },
    });

    expect(createMsg).toHaveBeenCalledTimes(1);
    expect(updateManyThread).not.toHaveBeenCalled();
  });

  it("inbound com CAS conflict persistente mantém mensagem e regista o conflito", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    findUniqueMsg.mockResolvedValue(null);
    findFirstThread.mockResolvedValue({ status: "CLOSED" });
    updateManyThread.mockResolvedValue({ count: 0 });

    const { waInboxCreateInbound } = await import("../waInboxMessageService");
    const result = await waInboxCreateInbound("tenant-a", "pnid-1", {
      waMessageId: "wam_conflict",
      from: "5511999999999",
      timestamp: "1700000000",
      type: "text",
      field: "messages",
      raw: { type: "text", text: { body: "ainda aqui" } },
    });

    expect(result).toEqual({
      threadId: "th1",
      messageId: "row1",
      wasNewConversation: true,
    });
    expect(createMsg).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "[wa-inbox] inbound reopen failed",
      expect.objectContaining({
        tenantId: "tenant-a",
        threadId: "th1",
        reason: "conflict",
      })
    );
    errorSpy.mockRestore();
  });
});
