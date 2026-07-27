import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dispatchMessageOutbound: vi.fn(),
  eventMessageCreated: vi.fn((_tenantId: string, payload: unknown) => payload),
  findTenant: vi.fn(),
  findUniqueMessage: vi.fn(),
  getThreadMetrics: vi.fn(),
  publishInboxEvent: vi.fn(),
  createMessage: vi.fn(),
  createStatusHistory: vi.fn(),
  updateManyThread: vi.fn(),
  upsertThread: vi.fn(),
}));

const transaction = vi.fn(async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
  callback(transactionClient)
);

const transactionClient = {
  waInboxMessage: {
    findUnique: (...args: unknown[]) => mocks.findUniqueMessage(...args),
    create: (...args: unknown[]) => mocks.createMessage(...args),
  },
  waInboxThread: {
    upsert: (...args: unknown[]) => mocks.upsertThread(...args),
    updateMany: (...args: unknown[]) => mocks.updateManyThread(...args),
  },
  waInboxStatusHistory: {
    create: (...args: unknown[]) => mocks.createStatusHistory(...args),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: {
      findUnique: (...args: unknown[]) => mocks.findTenant(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...(args as Parameters<typeof transaction>)),
  },
}));

vi.mock("../waInboxThreadMetrics", () => ({
  getWaInboxThreadInboxMetrics: (...args: unknown[]) => mocks.getThreadMetrics(...args),
}));

vi.mock("@/modules/realtime/realtime.service", () => ({
  eventMessageCreated: (...args: unknown[]) => mocks.eventMessageCreated(...args),
  publishInboxEvent: (...args: unknown[]) => mocks.publishInboxEvent(...args),
}));

vi.mock("@/modules/automation", () => ({
  dispatchMessageOutbound: (...args: unknown[]) => mocks.dispatchMessageOutbound(...args),
}));

const now = new Date("2026-07-27T15:00:00.000Z");

const thread = {
  id: "thread-1",
  lastMessageAt: now,
  lastMessagePreview: "Resposta",
  unreadCount: 0,
  lastCustomerMessageAt: now,
  lastAgentReplyAt: now,
  firstResponseAt: now,
};

const outboundRow = {
  id: "message-1",
  waMessageId: "wamid.outbound-1",
  direction: "OUTBOUND",
  fromNumber: "551133334444",
  toNumber: "5511999990000",
  messageType: "TEXT",
  contentText: "Resposta",
  ts: now,
  status: "SENT",
  createdAt: now,
};

const params = {
  tenantId: "tenant-1",
  businessPhoneNumberId: "phone-id-1",
  customerPhoneDigits: "5511999990000",
  waMessageId: "wamid.outbound-1",
  text: "Resposta",
  businessDigits: "551133334444",
  outboundKind: "agent" as const,
};

describe("waInboxCreateOutbound deduplicação persistida", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockClear();
    mocks.findTenant.mockResolvedValue({ id: "tenant-1" });
    mocks.findUniqueMessage.mockResolvedValue(null);
    mocks.upsertThread.mockResolvedValue(thread);
    mocks.updateManyThread.mockResolvedValue({ count: 1 });
    mocks.createMessage.mockResolvedValue(outboundRow);
    mocks.createStatusHistory.mockResolvedValue({});
    mocks.getThreadMetrics.mockResolvedValue({});
    mocks.dispatchMessageOutbound.mockResolvedValue(undefined);
  });

  it("não cria segunda row nem repete side effects para o mesmo tenantId_waMessageId", async () => {
    mocks.findUniqueMessage
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "message-1", waMessageId: "wamid.outbound-1" });

    const { waInboxCreateOutbound } = await import("../waInboxMessageService");

    await waInboxCreateOutbound(params);
    await waInboxCreateOutbound(params);

    expect(mocks.findUniqueMessage).toHaveBeenNthCalledWith(1, {
      where: {
        tenantId_waMessageId: {
          tenantId: "tenant-1",
          waMessageId: "wamid.outbound-1",
        },
      },
    });
    expect(mocks.findUniqueMessage).toHaveBeenNthCalledWith(2, {
      where: {
        tenantId_waMessageId: {
          tenantId: "tenant-1",
          waMessageId: "wamid.outbound-1",
        },
      },
    });
    expect(mocks.upsertThread).toHaveBeenCalledTimes(1);
    expect(mocks.updateManyThread).toHaveBeenCalledTimes(1);
    expect(mocks.createMessage).toHaveBeenCalledTimes(1);
    expect(mocks.createStatusHistory).toHaveBeenCalledTimes(1);
    expect(mocks.publishInboxEvent).toHaveBeenCalledTimes(1);
    expect(mocks.dispatchMessageOutbound).toHaveBeenCalledTimes(1);
  });

  it("mantém a chave de deduplicação isolada por tenant", async () => {
    const { waInboxCreateOutbound } = await import("../waInboxMessageService");

    await waInboxCreateOutbound({
      ...params,
      tenantId: "tenant-2",
    });

    expect(mocks.findTenant).toHaveBeenCalledWith({
      where: { id: "tenant-2" },
      select: { id: true },
    });
    expect(mocks.findUniqueMessage).toHaveBeenCalledWith({
      where: {
        tenantId_waMessageId: {
          tenantId: "tenant-2",
          waMessageId: "wamid.outbound-1",
        },
      },
    });
    expect(mocks.createMessage).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-2",
        waMessageId: "wamid.outbound-1",
      }),
    });
  });
});
