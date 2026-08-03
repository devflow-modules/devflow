import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    waInboxSendRequest: {
      findUnique: (...args: unknown[]) => mocks.findUnique(...args),
      create: (...args: unknown[]) => mocks.create(...args),
      updateMany: (...args: unknown[]) => mocks.updateMany(...args),
      update: (...args: unknown[]) => mocks.update(...args),
    },
  },
}));

import {
  beginOrLoadSendRequest,
  claimSendForMeta,
  findSendRequest,
  markSendCompleted,
  markSendFailedPreMeta,
  markSendMetaAccepted,
  markSendPersistFailed,
} from "../outboundSendRequestService";

describe("outboundSendRequestService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findSendRequest usa unique tenant+clientRequestId", async () => {
    mocks.findUnique.mockResolvedValue({ id: "r1" });
    const row = await findSendRequest("t1", "cr-abc-12345");
    expect(row).toEqual({ id: "r1" });
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: {
        tenantId_clientRequestId: { tenantId: "t1", clientRequestId: "cr-abc-12345" },
      },
    });
  });

  it("beginOrLoad cria PENDING; race devolve existente", async () => {
    mocks.create.mockRejectedValueOnce(new Error("unique"));
    mocks.findUnique.mockResolvedValue({ id: "existing", status: "PENDING" });
    const row = await beginOrLoadSendRequest({
      tenantId: "t1",
      threadId: "th1",
      userId: "u1",
      clientRequestId: "cr-abc-12345",
      text: "oi",
    });
    expect(row).toEqual({ id: "existing", status: "PENDING" });
  });

  it("claimSendForMeta só de PENDING ou FAILED_PRE_META sem waMessageId", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    expect(await claimSendForMeta("ledger-1")).toBe(true);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: "ledger-1",
        status: { in: ["PENDING", "FAILED_PRE_META"] },
        waMessageId: null,
      },
      data: { status: "SENDING", lastError: null },
    });
  });

  it("markSendPersistFailed mantém META_ACCEPTED (não reenvia Meta)", async () => {
    mocks.update.mockResolvedValue({});
    await markSendPersistFailed("ledger-1", "db down");
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "ledger-1" },
      data: {
        status: "META_ACCEPTED",
        lastError: "db down",
      },
    });
  });

  it("markSendFailedPreMeta / MetaAccepted / Completed", async () => {
    mocks.update.mockResolvedValue({});
    await markSendFailedPreMeta("ledger-1", "cloud down");
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "ledger-1" },
      data: {
        status: "FAILED_PRE_META",
        lastError: "cloud down",
        waMessageId: null,
      },
    });
    await markSendMetaAccepted("ledger-1", "wamid.1");
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "ledger-1" },
      data: { status: "META_ACCEPTED", waMessageId: "wamid.1", lastError: null },
    });
    await markSendCompleted("ledger-1", "wamid.1");
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "ledger-1" },
      data: { status: "COMPLETED", waMessageId: "wamid.1", lastError: null },
    });
  });

  it("claim CAS concorrente: exatamente um vencedor entre N callers", async () => {
    const row = {
      id: "ledger-race",
      status: "PENDING" as string,
      waMessageId: null as string | null,
    };
    mocks.updateMany.mockImplementation(async (args: {
      where: { id: string; status: { in: string[] }; waMessageId: null };
      data: { status: string };
    }) => {
      const eligible =
        row.id === args.where.id &&
        args.where.status.in.includes(row.status) &&
        row.waMessageId === null;
      if (!eligible) return { count: 0 };
      row.status = args.data.status;
      return { count: 1 };
    });

    const results = await Promise.all(
      Array.from({ length: 32 }, () => claimSendForMeta("ledger-race"))
    );

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(row.status).toBe("SENDING");
  });
});
