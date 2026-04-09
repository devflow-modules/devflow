import { describe, it, expect, vi, beforeEach } from "vitest";
import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";
import {
  assertAutomaticOutboundAllowed,
  evaluateOutboundWindowForInbound,
  getAutomaticReplyAbortReasonFromThread,
  isThreadHandledByHuman,
  parseOutboundKindFromContentJson,
} from "../automaticReplyGuard";

describe("parseOutboundKindFromContentJson", () => {
  it("default agent quando ausente", () => {
    expect(parseOutboundKindFromContentJson(null)).toBe("agent");
    expect(parseOutboundKindFromContentJson({})).toBe("agent");
  });
  it("lê outboundKind", () => {
    expect(parseOutboundKindFromContentJson({ outboundKind: "ai" })).toBe("ai");
    expect(parseOutboundKindFromContentJson({ outboundKind: "automation" })).toBe("automation");
  });
});

describe("getAutomaticReplyAbortReasonFromThread", () => {
  it("thread null → thread_missing", () => {
    expect(getAutomaticReplyAbortReasonFromThread(null)).toBe("thread_missing");
  });
  it("CLOSED → thread_not_open", () => {
    expect(
      getAutomaticReplyAbortReasonFromThread({
        status: WaInboxThreadStatus.CLOSED,
        assignedToUserId: null,
      })
    ).toBe("thread_not_open");
  });
  it("PENDING → thread_not_open", () => {
    expect(
      getAutomaticReplyAbortReasonFromThread({
        status: WaInboxThreadStatus.PENDING,
        assignedToUserId: null,
      })
    ).toBe("thread_not_open");
  });
  it("OPEN com agente → thread_assigned_to_human", () => {
    expect(
      getAutomaticReplyAbortReasonFromThread({
        status: WaInboxThreadStatus.OPEN,
        assignedToUserId: "u1",
      })
    ).toBe("thread_assigned_to_human");
  });
  it("OPEN sem agente → permite", () => {
    expect(
      getAutomaticReplyAbortReasonFromThread({
        status: WaInboxThreadStatus.OPEN,
        assignedToUserId: null,
      })
    ).toBeNull();
  });
});

describe("isThreadHandledByHuman", () => {
  it("true só com atribuição em OPEN", () => {
    expect(
      isThreadHandledByHuman({
        status: WaInboxThreadStatus.OPEN,
        assignedToUserId: "u1",
      })
    ).toBe(true);
    expect(
      isThreadHandledByHuman({
        status: WaInboxThreadStatus.OPEN,
        assignedToUserId: null,
      })
    ).toBe(false);
  });
});

describe("evaluateOutboundWindowForInbound", () => {
  const inboundTs = new Date("2026-01-01T12:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sem inbound na DB → null", async () => {
    const db = {
      waInboxMessage: {
        findFirst: vi.fn().mockResolvedValueOnce(null),
        findMany: vi.fn(),
      },
      waInboxThread: { findFirst: vi.fn() },
      aiMessageLog: { findFirst: vi.fn() },
    };
    const r = await evaluateOutboundWindowForInbound(db as never, {
      tenantId: "t1",
      threadId: "th1",
      inboundWaMessageId: "w1",
      triggerSource: "legacy",
    });
    expect(r).toBeNull();
  });

  it("primeiro outbound na janela é agent → manual_reply_detected", async () => {
    const db = {
      waInboxMessage: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ ts: inboundTs })
          .mockResolvedValueOnce(null),
        findMany: vi.fn().mockResolvedValue([{ contentJson: { outboundKind: "agent" } }]),
      },
      waInboxThread: { findFirst: vi.fn() },
      aiMessageLog: { findFirst: vi.fn() },
    };
    const r = await evaluateOutboundWindowForInbound(db as never, {
      tenantId: "t1",
      threadId: "th1",
      inboundWaMessageId: "w1",
      triggerSource: "legacy",
    });
    expect(r).toBe("manual_reply_detected");
  });

  it("primeiro outbound ai → duplicate_automation_blocked", async () => {
    const db = {
      waInboxMessage: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ ts: inboundTs })
          .mockResolvedValueOnce(null),
        findMany: vi.fn().mockResolvedValue([{ contentJson: { outboundKind: "ai" } }]),
      },
      waInboxThread: { findFirst: vi.fn() },
      aiMessageLog: { findFirst: vi.fn() },
    };
    const r = await evaluateOutboundWindowForInbound(db as never, {
      tenantId: "t1",
      threadId: "th1",
      inboundWaMessageId: "w1",
      triggerSource: "legacy",
    });
    expect(r).toBe("duplicate_automation_blocked");
  });

  it("trigger ai + log com outbound → duplicate_ai_log_detected", async () => {
    const db = {
      waInboxMessage: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ ts: inboundTs })
          .mockResolvedValueOnce(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      waInboxThread: { findFirst: vi.fn() },
      aiMessageLog: { findFirst: vi.fn().mockResolvedValue({ id: "log1" }) },
    };
    const r = await evaluateOutboundWindowForInbound(db as never, {
      tenantId: "t1",
      threadId: "th1",
      inboundWaMessageId: "w1",
      triggerSource: "ai",
    });
    expect(r).toBe("duplicate_ai_log_detected");
  });
});

describe("assertAutomaticOutboundAllowed", () => {
  it("bloqueia thread atribuída", async () => {
    const db = {
      waInboxThread: {
        findFirst: vi.fn().mockResolvedValue({
          status: WaInboxThreadStatus.OPEN,
          assignedToUserId: "agent-1",
        }),
      },
      waInboxMessage: { findFirst: vi.fn(), findMany: vi.fn() },
      aiMessageLog: { findFirst: vi.fn() },
    };
    const r = await assertAutomaticOutboundAllowed(db as never, {
      tenantId: "t1",
      threadId: "th1",
      trigger: { inboundWaMessageId: "w1", triggerSource: "legacy" },
    });
    expect(r).toEqual({ allowed: false, reason: "thread_assigned_to_human" });
  });

  it("sem trigger → só valida thread", async () => {
    const db = {
      waInboxThread: {
        findFirst: vi.fn().mockResolvedValue({
          status: WaInboxThreadStatus.OPEN,
          assignedToUserId: null,
        }),
      },
      waInboxMessage: { findFirst: vi.fn(), findMany: vi.fn() },
      aiMessageLog: { findFirst: vi.fn() },
    };
    const r = await assertAutomaticOutboundAllowed(db as never, {
      tenantId: "t1",
      threadId: "th1",
    });
    expect(r).toEqual({ allowed: true });
    expect(db.waInboxMessage.findFirst).not.toHaveBeenCalled();
  });
});
