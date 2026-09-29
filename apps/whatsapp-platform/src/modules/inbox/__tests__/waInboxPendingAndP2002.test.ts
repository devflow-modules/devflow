import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();
const mockPendingFindMany = vi.fn();
const mockPendingDelete = vi.fn();
const mockTransaction = vi.fn();
const mockTx = {
  waInboxMessage: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  waInboxStatusHistory: { create: vi.fn() },
  waInboxThread: { findUnique: vi.fn(), upsert: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    waInboxMessage: { findUnique: (...a: unknown[]) => mockFindUnique(...a) },
    waInboxPendingStatus: {
      upsert: (...a: unknown[]) => mockUpsert(...a),
      findMany: (...a: unknown[]) => mockPendingFindMany(...a),
      delete: (...a: unknown[]) => mockPendingDelete(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}));

vi.mock("@/modules/realtime/realtime.service", () => ({
  publishInboxEvent: vi.fn(),
  eventMessageStatusUpdated: vi.fn(() => ({})),
}));

describe("waInboxApplyStatus orphan buffer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    );
  });

  it("status before message → upserts pending, returns false", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockUpsert.mockResolvedValue({});
    const { waInboxApplyStatus } = await import("../waInboxMessageService");
    const ok = await waInboxApplyStatus("tenant-a", {
      waMessageId: "wamid.1",
      status: "delivered",
      timestamp: "1710000000",
      raw: { id: "wamid.1", status: "delivered" },
    });
    expect(ok).toBe(false);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          tenantId: "tenant-a",
          waMessageId: "wamid.1",
          metaStatus: "delivered",
        }),
      })
    );
  });
});

describe("waInboxCreateInbound P2002 convergence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("P2002 on create converges to null (idempotent)", async () => {
    mockTransaction.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint"), { code: "P2002" })
    );
    const { waInboxCreateInbound } = await import("../waInboxMessageService");
    const result = await waInboxCreateInbound("tenant-a", "pnid", {
      waMessageId: "wamid.race",
      from: "5511999999999",
      timestamp: "1710000000",
      type: "text",
      field: "messages",
      raw: { text: { body: "oi" } },
    });
    expect(result).toBeNull();
  });
});
