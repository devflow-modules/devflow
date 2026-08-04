import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  update: vi.fn(),
  count: vi.fn(),
  threadFindFirst: vi.fn(),
  phoneFindFirst: vi.fn(),
  createOutbound: vi.fn(),
  markCompleted: vi.fn(),
  markPersistFailed: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    waInboxSendRequest: {
      findMany: (...a: unknown[]) => mocks.findMany(...a),
      findFirst: (...a: unknown[]) => mocks.findFirst(...a),
      updateMany: (...a: unknown[]) => mocks.updateMany(...a),
      update: (...a: unknown[]) => mocks.update(...a),
      count: (...a: unknown[]) => mocks.count(...a),
    },
    waInboxThread: {
      findFirst: (...a: unknown[]) => mocks.threadFindFirst(...a),
    },
    whatsappPhoneNumber: {
      findFirst: (...a: unknown[]) => mocks.phoneFindFirst(...a),
    },
  },
}));

vi.mock("@/modules/inbox/waInboxMessageService", () => ({
  waInboxCreateOutbound: (...a: unknown[]) => mocks.createOutbound(...a),
}));

vi.mock("@/modules/inbox/outboundSendRequestService", () => ({
  markSendCompleted: (...a: unknown[]) => mocks.markCompleted(...a),
  markSendPersistFailed: (...a: unknown[]) => mocks.markPersistFailed(...a),
}));

vi.mock("@/modules/inbox/auditService", () => ({
  logAction: (...a: unknown[]) => mocks.logAction(...a),
}));

vi.mock("@/lib/observability", () => ({
  logEvent: vi.fn(),
  logError: vi.fn(),
}));

import {
  ACK_RESOLVED_PREFIX,
  UNKNOWN_OUTCOME_MARKER,
  acknowledgeUnknownOutcome,
  claimSendingToUnknownOutcome,
  runOutboundSendReconcileJob,
} from "../outboundSendReconcileService";

describe("outboundSendReconcileService", () => {
  const now = new Date("2026-08-04T15:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
    mocks.updateMany.mockResolvedValue({ count: 0 });
  });

  it("SENDING recente não muda", async () => {
    mocks.findMany.mockResolvedValueOnce([
      {
        id: "s1",
        tenantId: "t1",
        threadId: "th1",
        waMessageId: null,
        updatedAt: new Date(now.getTime() - 60_000),
        clientRequestId: "cr-1",
      },
    ]);

    const counts = await runOutboundSendReconcileJob({
      now,
      staleAfterMs: 5 * 60_000,
      limit: 10,
    });

    expect(counts.sendingLeftRecent).toBe(1);
    expect(counts.markedUnknown).toBe(0);
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.createOutbound).not.toHaveBeenCalled();
  });

  it("SENDING antigo sem evidência → UNKNOWN_OUTCOME (CAS), sem Meta", async () => {
    mocks.findMany
      .mockResolvedValueOnce([
        {
          id: "s2",
          tenantId: "t1",
          threadId: "th1",
          waMessageId: null,
          updatedAt: new Date(now.getTime() - 10 * 60_000),
          clientRequestId: "cr-2",
        },
      ])
      .mockResolvedValueOnce([]);
    mocks.updateMany.mockResolvedValue({ count: 1 });

    const counts = await runOutboundSendReconcileJob({
      now,
      staleAfterMs: 5 * 60_000,
      limit: 10,
    });

    expect(counts.markedUnknown).toBe(1);
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "s2",
          tenantId: "t1",
          status: "SENDING",
          waMessageId: null,
        }),
        data: expect.objectContaining({
          status: "UNKNOWN_OUTCOME",
          lastError: UNKNOWN_OUTCOME_MARKER,
        }),
      })
    );
    expect(mocks.createOutbound).not.toHaveBeenCalled();
  });

  it("dry-run não persiste UNKNOWN", async () => {
    mocks.findMany.mockResolvedValueOnce([
      {
        id: "s3",
        tenantId: "t1",
        threadId: "th1",
        waMessageId: null,
        updatedAt: new Date(now.getTime() - 10 * 60_000),
        clientRequestId: "cr-3",
      },
    ]);
    mocks.findFirst.mockResolvedValue({ id: "s3" });

    const counts = await runOutboundSendReconcileJob({
      now,
      staleAfterMs: 5 * 60_000,
      dryRun: true,
      limit: 10,
    });

    expect(counts.markedUnknown).toBe(1);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("SENDING antigo com waMessageId promove sem Meta e completa", async () => {
    mocks.findMany
      .mockResolvedValueOnce([
        {
          id: "s4",
          tenantId: "t1",
          threadId: "th1",
          waMessageId: "wamid.x",
          updatedAt: new Date(now.getTime() - 10 * 60_000),
          clientRequestId: "cr-4",
        },
      ])
      .mockResolvedValueOnce([]);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findFirst.mockResolvedValue({
      id: "s4",
      tenantId: "t1",
      threadId: "th1",
      status: "META_ACCEPTED",
      waMessageId: "wamid.x",
      text: "olá",
    });
    mocks.threadFindFirst.mockResolvedValue({
      id: "th1",
      phoneNumber: "5511999",
      businessPhoneNumberId: "pn1",
    });
    mocks.phoneFindFirst.mockResolvedValue({
      phoneNumberId: "pn1",
      displayPhoneNumber: "+55 11",
    });
    mocks.createOutbound.mockResolvedValue(undefined);
    mocks.markCompleted.mockResolvedValue(undefined);

    const counts = await runOutboundSendReconcileJob({
      now,
      staleAfterMs: 5 * 60_000,
      limit: 10,
    });

    expect(counts.promotedMetaAccepted).toBe(1);
    expect(counts.completedFromMetaAccepted).toBe(1);
    expect(mocks.createOutbound).toHaveBeenCalledTimes(1);
    expect(mocks.markCompleted).toHaveBeenCalledWith("s4", "wamid.x");
  });

  it("reconciliação repetida é idempotente (CAS count 0)", async () => {
    mocks.findMany
      .mockResolvedValueOnce([
        {
          id: "s5",
          tenantId: "t1",
          threadId: "th1",
          waMessageId: null,
          updatedAt: new Date(now.getTime() - 10 * 60_000),
          clientRequestId: "cr-5",
        },
      ])
      .mockResolvedValueOnce([]);
    mocks.updateMany.mockResolvedValue({ count: 0 });

    const counts = await runOutboundSendReconcileJob({
      now,
      staleAfterMs: 5 * 60_000,
      limit: 10,
    });

    expect(counts.markedUnknown).toBe(0);
    expect(counts.skipped).toBe(1);
  });

  it("duas CAS concorrentes: só uma marca UNKNOWN", async () => {
    mocks.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const staleBefore = new Date(now.getTime() - 5 * 60_000);
    const a = await claimSendingToUnknownOutcome({
      id: "s6",
      tenantId: "t1",
      staleBefore,
    });
    const b = await claimSendingToUnknownOutcome({
      id: "s6",
      tenantId: "t1",
      staleBefore,
    });

    expect(a).toBe(true);
    expect(b).toBe(false);
  });

  it("tenant scope no where da listagem CAS", async () => {
    mocks.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await runOutboundSendReconcileJob({ tenantId: "tenant-a", now, limit: 5 });
    expect(mocks.findMany.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "tenant-a", status: "SENDING" }),
      })
    );
  });

  it("acknowledge UNKNOWN_OUTCOME fail-closed se outro status", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "s7",
      tenantId: "t1",
      threadId: "th1",
      status: "SENDING",
    });
    const r = await acknowledgeUnknownOutcome({
      tenantId: "t1",
      id: "s7",
      actorUserId: "u1",
    });
    expect(r).toEqual({ ok: false, code: "NOT_UNKNOWN" });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("acknowledge UNKNOWN_OUTCOME grava RESOLVED sem mudar status (sem Meta)", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "s8",
      tenantId: "t1",
      threadId: "th1",
      status: "UNKNOWN_OUTCOME",
    });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.logAction.mockResolvedValue(undefined);

    const r = await acknowledgeUnknownOutcome({
      tenantId: "t1",
      id: "s8",
      actorUserId: "u1",
      note: "visto",
    });
    expect(r).toEqual({ ok: true });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: "s8",
        tenantId: "t1",
        status: "UNKNOWN_OUTCOME",
      },
      data: {
        lastError: expect.stringContaining(`${ACK_RESOLVED_PREFIX}u1|visto`),
      },
    });
    expect(mocks.logAction).toHaveBeenCalledWith(
      "t1",
      "th1",
      "u1",
      "status_change",
      expect.objectContaining({
        reconcile: "acknowledge_unknown_outcome",
        ledgerId: "s8",
      })
    );
  });

  it("acknowledge repetido é idempotente e não reabre retry", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "s9",
      tenantId: "t1",
      threadId: "th1",
      status: "UNKNOWN_OUTCOME",
      lastError: `${ACK_RESOLVED_PREFIX}u0|já`,
    });

    const r = await acknowledgeUnknownOutcome({
      tenantId: "t1",
      id: "s9",
      actorUserId: "u1",
      note: "de novo",
    });
    expect(r).toEqual({ ok: true, alreadyAcknowledged: true });
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.logAction).not.toHaveBeenCalled();
  });
});
