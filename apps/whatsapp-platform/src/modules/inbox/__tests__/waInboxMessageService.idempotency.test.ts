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
}));

const findUniqueMsg = vi.fn();
const createMsg = vi.fn();

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
});
