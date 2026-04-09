import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  Prisma,
  WaAutoReplyClaimStatus,
  WaAutoReplyClaimTrigger,
  WaInboxThreadStatus,
} from "@/generated/prisma-whatsapp";

function prismaUniqueError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
    meta: {
      modelName: "WaAutoReplyClaim",
      target: ["tenant_id", "wa_inbox_thread_id", "inbound_wa_message_id", "trigger_source"],
    },
  });
}

describe("claimAutomaticReplySend (mock transacional)", () => {
  const trigger = { inboundWaMessageId: "wam-in-1", triggerSource: "ai" as const };
  const baseParams = {
    tenantId: "t1",
    threadId: "th1",
    trigger,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cria claim com sucesso", async () => {
    const findFirstThread = vi.fn().mockResolvedValue({
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
    });
    const findFirstMsg = vi.fn().mockResolvedValue(null);
    const findManyMsg = vi.fn().mockResolvedValue([]);
    const findFirstLog = vi.fn().mockResolvedValue(null);
    const deleteManyClaim = vi.fn().mockResolvedValue({ count: 0 });
    const createClaim = vi.fn().mockResolvedValue({
      id: "claim-new",
      claimToken: "uuid-token",
    });

    const prisma = {
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          waInboxThread: { findFirst: findFirstThread },
          waInboxMessage: { findFirst: findFirstMsg, findMany: findManyMsg },
          aiMessageLog: { findFirst: findFirstLog },
          waAutoReplyClaim: {
            deleteMany: deleteManyClaim,
            create: createClaim,
            findUnique: vi.fn(),
            delete: vi.fn(),
          },
        })
      ),
    };

    const { claimAutomaticReplySend } = await import("../automaticReplyClaimService");
    const r = await claimAutomaticReplySend(prisma as never, baseParams);
    expect(r).toEqual({ ok: true, claimId: "claim-new", claimToken: "uuid-token" });
    expect(createClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "t1",
          waInboxThreadId: "th1",
          inboundWaMessageId: "wam-in-1",
          triggerSource: WaAutoReplyClaimTrigger.AI,
          status: WaAutoReplyClaimStatus.PENDING,
        }),
      })
    );
  });

  it("claim duplicado (P2002 + PENDING válido) → duplicate_claim", async () => {
    const findFirstThread = vi.fn().mockResolvedValue({
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
    });
    const findFirstMsg = vi.fn().mockResolvedValue(null);
    const findManyMsg = vi.fn().mockResolvedValue([]);
    const findFirstLog = vi.fn().mockResolvedValue(null);
    const deleteManyClaim = vi.fn().mockResolvedValue({ count: 0 });
    const createClaim = vi.fn().mockRejectedValue(prismaUniqueError());
    const findUniqueClaim = vi.fn().mockResolvedValue({
      id: "existing",
      status: WaAutoReplyClaimStatus.PENDING,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const prisma = {
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          waInboxThread: { findFirst: findFirstThread },
          waInboxMessage: { findFirst: findFirstMsg, findMany: findManyMsg },
          aiMessageLog: { findFirst: findFirstLog },
          waAutoReplyClaim: {
            deleteMany: deleteManyClaim,
            create: createClaim,
            findUnique: findUniqueClaim,
            delete: vi.fn(),
          },
        })
      ),
    };

    const { claimAutomaticReplySend } = await import("../automaticReplyClaimService");
    const r = await claimAutomaticReplySend(prisma as never, baseParams);
    expect(r).toEqual({ ok: false, reason: "duplicate_claim" });
  });

  it("após FAILED remove e recria claim", async () => {
    const findFirstThread = vi.fn().mockResolvedValue({
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
    });
    const findFirstMsg = vi.fn().mockResolvedValue(null);
    const findManyMsg = vi.fn().mockResolvedValue([]);
    const findFirstLog = vi.fn().mockResolvedValue(null);
    const deleteManyClaim = vi.fn().mockResolvedValue({ count: 0 });
    const createClaim = vi
      .fn()
      .mockRejectedValueOnce(prismaUniqueError())
      .mockResolvedValueOnce({ id: "claim-2", claimToken: "tok-2" });
    const findUniqueClaim = vi.fn().mockResolvedValue({
      id: "old",
      status: WaAutoReplyClaimStatus.FAILED,
    });
    const deleteClaim = vi.fn().mockResolvedValue({});

    const prisma = {
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          waInboxThread: { findFirst: findFirstThread },
          waInboxMessage: { findFirst: findFirstMsg, findMany: findManyMsg },
          aiMessageLog: { findFirst: findFirstLog },
          waAutoReplyClaim: {
            deleteMany: deleteManyClaim,
            create: createClaim,
            findUnique: findUniqueClaim,
            delete: deleteClaim,
          },
        })
      ),
    };

    const { claimAutomaticReplySend } = await import("../automaticReplyClaimService");
    const r = await claimAutomaticReplySend(prisma as never, baseParams);
    expect(r).toEqual({ ok: true, claimId: "claim-2", claimToken: "tok-2" });
    expect(deleteClaim).toHaveBeenCalledWith({ where: { id: "old" } });
  });
});

describe("completeAutomaticReplyClaim", () => {
  it("marca SENT com outboundWaMessageId", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findUnique = vi.fn().mockResolvedValue({
      tenantId: "t1",
      waInboxThreadId: "th1",
      triggerSource: WaAutoReplyClaimTrigger.AI,
      outboundWaMessageId: "wam-out-99",
    });
    const prisma = { waAutoReplyClaim: { updateMany, findUnique } };
    const { completeAutomaticReplyClaim } = await import("../automaticReplyClaimService");
    const r = await completeAutomaticReplyClaim(prisma as never, {
      claimId: "c1",
      claimToken: "tok",
      outboundWaMessageId: "wam-out-99",
    });
    expect(r).toEqual({ ok: true });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "c1",
        claimToken: "tok",
        status: WaAutoReplyClaimStatus.PENDING,
      },
      data: {
        status: WaAutoReplyClaimStatus.SENT,
        outboundWaMessageId: "wam-out-99",
        failureReason: null,
      },
    });
  });
});

describe("verifyAutomaticReplyClaimBeforeSend", () => {
  it("claim expirado → claim_expired e update EXPIRED", async () => {
    const findFirstThread = vi.fn().mockResolvedValue({
      status: WaInboxThreadStatus.OPEN,
      assignedToUserId: null,
    });
    const findFirstMsg = vi.fn().mockResolvedValue(null);
    const findManyMsg = vi.fn().mockResolvedValue([]);
    const findUniqueClaim = vi.fn().mockResolvedValue({
      id: "c1",
      claimToken: "tok",
      status: WaAutoReplyClaimStatus.PENDING,
      expiresAt: new Date(Date.now() - 1000),
    });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });

    const prisma = {
      waInboxThread: { findFirst: findFirstThread },
      waInboxMessage: { findFirst: findFirstMsg, findMany: findManyMsg },
      aiMessageLog: { findFirst: vi.fn() },
      waAutoReplyClaim: { findUnique: findUniqueClaim, updateMany },
    };

    const { verifyAutomaticReplyClaimBeforeSend } = await import("../automaticReplyClaimService");
    const r = await verifyAutomaticReplyClaimBeforeSend(prisma as never, {
      claimId: "c1",
      claimToken: "tok",
      tenantId: "t1",
      threadId: "th1",
      trigger: { inboundWaMessageId: "w1", triggerSource: "ai" },
    });
    expect(r).toEqual({ ok: false, reason: "claim_expired" });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: WaAutoReplyClaimStatus.EXPIRED,
          failureReason: "claim_expired",
        }),
      })
    );
  });
});

describe("concorrência simulada (dois $transaction em paralelo)", () => {
  it("só um worker obtém claim quando o segundo recebe P2002", async () => {
    const store = new Map<string, { status: string; expiresAt: Date; claimToken: string }>();

    function makeTx() {
      return {
        waInboxThread: {
          findFirst: vi.fn().mockResolvedValue({
            status: WaInboxThreadStatus.OPEN,
            assignedToUserId: null,
          }),
        },
        waInboxMessage: {
          findFirst: vi.fn().mockResolvedValue(null),
          findMany: vi.fn().mockResolvedValue([]),
        },
        aiMessageLog: { findFirst: vi.fn().mockResolvedValue(null) },
        waAutoReplyClaim: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
            const k = `${data.tenantId}|${data.waInboxThreadId}|${data.inboundWaMessageId}|${data.triggerSource}`;
            if (store.has(k)) {
              return Promise.reject(prismaUniqueError());
            }
            store.set(k, {
              status: "PENDING",
              expiresAt: data.expiresAt as Date,
              claimToken: data.claimToken as string,
            });
            return Promise.resolve({
              id: `id-${k}`,
              claimToken: data.claimToken,
            });
          }),
          findUnique: vi.fn(({ where }: { where: { tenantId_waInboxThreadId_inboundWaMessageId_triggerSource: Record<string, string> } }) => {
            const w = where.tenantId_waInboxThreadId_inboundWaMessageId_triggerSource;
            const k = `${w.tenantId}|${w.waInboxThreadId}|${w.inboundWaMessageId}|${w.triggerSource}`;
            const row = store.get(k);
            if (!row) return Promise.resolve(null);
            return Promise.resolve({
              id: "x",
              status: WaAutoReplyClaimStatus.PENDING,
              expiresAt: row.expiresAt,
            });
          }),
          delete: vi.fn(),
        },
      };
    }

    const prisma = {
      $transaction: (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => fn(makeTx()),
    };

    const params = {
      tenantId: "t1",
      threadId: "th1",
      trigger: { inboundWaMessageId: "wam-x", triggerSource: "ai" as const },
    };

    const { claimAutomaticReplySend } = await import("../automaticReplyClaimService");
    const [a, b] = await Promise.all([
      claimAutomaticReplySend(prisma as never, params),
      claimAutomaticReplySend(prisma as never, params),
    ]);
    const wins = [a, b].filter((r) => r.ok);
    const losses = [a, b].filter((r) => !r.ok);
    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(1);
    expect(losses[0]).toMatchObject({ ok: false, reason: "duplicate_claim" });
  });
});
