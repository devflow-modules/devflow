import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  WaInboxThreadStatus,
  WaAutoReplyClaimStatus,
  WhatsappPhoneNumberStatus,
} from "@/generated/prisma-whatsapp";

const prismaMocks = vi.hoisted(() => ({
  findFirstThread: vi.fn(),
  findFirstMsg: vi.fn(),
  findManyMsg: vi.fn(),
  findFirstLog: vi.fn(),
  sendText: vi.fn().mockResolvedValue({ messageId: "wa-api-1" }),
  claimDeleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  claimCreate: vi.fn(),
  claimFindUnique: vi.fn(),
  claimDelete: vi.fn().mockResolvedValue({}),
  claimUpdateMany: vi.fn().mockResolvedValue({ count: 1 }),
}));

function makeTx() {
  return {
    waInboxThread: { findFirst: prismaMocks.findFirstThread },
    waInboxMessage: {
      findFirst: prismaMocks.findFirstMsg,
      findMany: prismaMocks.findManyMsg,
    },
    aiMessageLog: { findFirst: prismaMocks.findFirstLog },
    waAutoReplyClaim: {
      deleteMany: prismaMocks.claimDeleteMany,
      create: prismaMocks.claimCreate,
      findUnique: prismaMocks.claimFindUnique,
      delete: prismaMocks.claimDelete,
    },
  };
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => fn(makeTx() as ReturnType<typeof makeTx>),
    waInboxThread: { findFirst: prismaMocks.findFirstThread },
    waInboxMessage: {
      findFirst: prismaMocks.findFirstMsg,
      findMany: prismaMocks.findManyMsg,
    },
    aiMessageLog: { findFirst: prismaMocks.findFirstLog },
    waAutoReplyClaim: {
      findUnique: prismaMocks.claimFindUnique,
      updateMany: prismaMocks.claimUpdateMany,
    },
  },
}));

vi.mock("@devflow/whatsapp-core", () => ({
  WhatsAppCloudAdapter: class {
    constructor(_opts: unknown) {}
    sendText = prismaMocks.sendText;
  },
}));

vi.mock("@/modules/inbox", () => ({
  waInboxCreateOutbound: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/analytics", () => ({ trackMessageSent: vi.fn() }));
vi.mock("@/modules/billing/usageService", () => ({ trackUsage: vi.fn() }));
vi.mock("@/lib/observability", () => ({
  bumpMetric: vi.fn(),
  logEvent: vi.fn(),
  maskPhoneLike: (s: string) => `***${String(s).replace(/\D/g, "").slice(-2)}`,
}));

describe("sendWebhookAutoReply — gate + claim", () => {
  const tenant = {
    id: "tenant-1",
    phoneNumberId: "pn1",
    displayPhoneNumber: "55114000",
    accessToken: "token",
    channelStatus: WhatsappPhoneNumberStatus.ACTIVE,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.findFirstMsg.mockResolvedValue(null);
    prismaMocks.findManyMsg.mockResolvedValue([]);
    prismaMocks.findFirstLog.mockResolvedValue(null);
    prismaMocks.claimDeleteMany.mockResolvedValue({ count: 0 });
    prismaMocks.claimCreate.mockResolvedValue({
      id: "claim-1",
      claimToken: "token-claim-1",
    });
    prismaMocks.claimFindUnique.mockResolvedValue({
      id: "claim-1",
      claimToken: "token-claim-1",
      status: WaAutoReplyClaimStatus.PENDING,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMocks.claimUpdateMany.mockResolvedValue({ count: 1 });
    prismaMocks.findFirstThread.mockResolvedValue({
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
    });
  });

  it("aborta quando thread atribuída a agente (gate na transação de claim)", async () => {
    prismaMocks.findFirstThread.mockResolvedValue({
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: "u1",
    });
    const { sendWebhookAutoReply } = await import("../sendMessageService");
    const r = await sendWebhookAutoReply({
      tenant,
      to: "5511999999999",
      text: "auto",
      inboxThreadId: "thread-1",
      outboundKind: "ai",
      automaticTrigger: { inboundWaMessageId: "in-1", triggerSource: "ai" },
    });
    expect(r).toEqual({ ok: false, aborted: true, reason: "thread_assigned_to_human" });
    expect(prismaMocks.sendText).not.toHaveBeenCalled();
    expect(prismaMocks.claimCreate).not.toHaveBeenCalled();
  });

  it("envia quando thread OPEN sem agente, claim e janela livre", async () => {
    const { sendWebhookAutoReply } = await import("../sendMessageService");
    const r = await sendWebhookAutoReply({
      tenant,
      to: "5511999999999",
      text: "auto",
      inboxThreadId: "thread-1",
      outboundKind: "ai",
      automaticTrigger: { inboundWaMessageId: "in-1", triggerSource: "legacy" },
    });
    expect(r).toEqual({ ok: true, messageId: "wa-api-1" });
    expect(prismaMocks.claimCreate).toHaveBeenCalled();
    expect(prismaMocks.sendText).toHaveBeenCalled();
  });

  it("aborta duplicate na janela (já existe outbound ai)", async () => {
    const t0 = new Date("2026-04-01T10:00:00Z");
    prismaMocks.findFirstMsg
      .mockResolvedValueOnce({ ts: t0 })
      .mockResolvedValueOnce(null);
    prismaMocks.findManyMsg.mockResolvedValue([{ contentJson: { outboundKind: "ai" } }]);
    const { sendWebhookAutoReply } = await import("../sendMessageService");
    const r = await sendWebhookAutoReply({
      tenant,
      to: "5511999999999",
      text: "dup",
      inboxThreadId: "thread-1",
      automaticTrigger: { inboundWaMessageId: "in-1", triggerSource: "legacy" },
    });
    expect(r).toEqual({ ok: false, aborted: true, reason: "duplicate_automation_blocked" });
    expect(prismaMocks.sendText).not.toHaveBeenCalled();
    expect(prismaMocks.claimCreate).not.toHaveBeenCalled();
  });

  it("pre-send verify bloqueia se humano assumir após claim", async () => {
    prismaMocks.findFirstThread
      .mockReset()
      .mockResolvedValueOnce({
        status: WaInboxThreadStatus.OPEN,
        assignedToUserId: null,
      })
      .mockResolvedValue({
        status: WaInboxThreadStatus.OPEN,
        assignedToUserId: "human",
      });
    const { sendWebhookAutoReply } = await import("../sendMessageService");
    const r = await sendWebhookAutoReply({
      tenant,
      to: "5511999999999",
      text: "x",
      inboxThreadId: "thread-1",
      automaticTrigger: { inboundWaMessageId: "in-1", triggerSource: "ai" },
    });
    expect(r).toEqual({ ok: false, aborted: true, reason: "thread_assigned_to_human" });
    expect(prismaMocks.sendText).not.toHaveBeenCalled();
    expect(prismaMocks.claimUpdateMany).toHaveBeenCalled();
  });
});
