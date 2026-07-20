import { describe, it, expect, vi, beforeEach } from "vitest";
import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";

const mockBumpMetric = vi.fn();
const mockPublish = vi.fn();
const mockLogAction = vi.fn().mockResolvedValue(undefined);
const mockDispatchStatusChanged = vi.fn().mockResolvedValue(undefined);

const mockPrisma = {
  waInboxThread: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/observability", () => ({
  bumpMetric: (...args: unknown[]) => mockBumpMetric(...args),
}));
vi.mock("@/modules/realtime/realtime.service", () => ({
  publishInboxEvent: (...args: unknown[]) => mockPublish(...args),
  eventConversationStatusChanged: (_t: string, p: unknown) => ({
    type: "conversation.status_changed",
    payload: p,
  }),
}));
vi.mock("../auditService", () => ({
  logAction: (...args: unknown[]) => mockLogAction(...args),
}));
vi.mock("@/modules/automation", () => ({
  dispatchStatusChanged: (...args: unknown[]) => mockDispatchStatusChanged(...args),
}));

describe("threadStatusService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogAction.mockResolvedValue(undefined);
    mockDispatchStatusChanged.mockResolvedValue(undefined);
  });

  it("CLOSED → OPEN atualiza com CAS, audita previousStatus e dispara side effects", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({ status: WaInboxThreadStatus.CLOSED });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 1 });

    const { updateThreadStatus } = await import("../threadStatusService");
    const result = await updateThreadStatus(
      "tenant1",
      "thread1",
      WaInboxThreadStatus.OPEN,
      "user1"
    );

    expect(result).toEqual({ ok: true });
    expect(mockPrisma.waInboxThread.updateMany).toHaveBeenCalledWith({
      where: {
        id: "thread1",
        tenantId: "tenant1",
        status: WaInboxThreadStatus.CLOSED,
      },
      data: { status: WaInboxThreadStatus.OPEN },
    });
    expect(mockBumpMetric).toHaveBeenCalledWith("threads_opened");
    expect(mockPublish).toHaveBeenCalled();
    expect(mockLogAction).toHaveBeenCalledWith("tenant1", "thread1", "user1", "status_change", {
      previousStatus: WaInboxThreadStatus.CLOSED,
      status: WaInboxThreadStatus.OPEN,
    });
    expect(mockDispatchStatusChanged).toHaveBeenCalledWith(
      "tenant1",
      "thread1",
      WaInboxThreadStatus.OPEN
    );
  });

  it("OPEN → OPEN é no-op sem side effects", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({ status: WaInboxThreadStatus.OPEN });

    const { updateThreadStatus } = await import("../threadStatusService");
    const result = await updateThreadStatus(
      "tenant1",
      "thread1",
      WaInboxThreadStatus.OPEN,
      "user1"
    );

    expect(result).toEqual({ ok: true });
    expect(mockPrisma.waInboxThread.updateMany).not.toHaveBeenCalled();
    expect(mockBumpMetric).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
    expect(mockLogAction).not.toHaveBeenCalled();
    expect(mockDispatchStatusChanged).not.toHaveBeenCalled();
  });

  it("retorna not_found quando thread não existe no tenant", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue(null);

    const { updateThreadStatus } = await import("../threadStatusService");
    const result = await updateThreadStatus(
      "tenant1",
      "missing",
      WaInboxThreadStatus.CLOSED,
      "user1"
    );

    expect(result).toEqual({ ok: false, reason: "not_found" });
    expect(mockPrisma.waInboxThread.updateMany).not.toHaveBeenCalled();
    expect(mockLogAction).not.toHaveBeenCalled();
  });

  it("isolamento: findFirst filtra por tenantId", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue(null);

    const { updateThreadStatus } = await import("../threadStatusService");
    await updateThreadStatus("tenant-a", "thread1", WaInboxThreadStatus.OPEN);

    expect(mockPrisma.waInboxThread.findFirst).toHaveBeenCalledWith({
      where: { id: "thread1", tenantId: "tenant-a" },
      select: { status: true },
    });
  });

  it("CAS miss + segunda leitura já no status pedido → sucesso idempotente sem side effects", async () => {
    mockPrisma.waInboxThread.findFirst
      .mockResolvedValueOnce({ status: WaInboxThreadStatus.CLOSED })
      .mockResolvedValueOnce({ status: WaInboxThreadStatus.OPEN });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 0 });

    const { updateThreadStatus } = await import("../threadStatusService");
    const result = await updateThreadStatus(
      "tenant1",
      "thread1",
      WaInboxThreadStatus.OPEN,
      "user1"
    );

    expect(result).toEqual({ ok: true });
    expect(mockPrisma.waInboxThread.updateMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.waInboxThread.updateMany).toHaveBeenCalledWith({
      where: {
        id: "thread1",
        tenantId: "tenant1",
        status: WaInboxThreadStatus.CLOSED,
      },
      data: { status: WaInboxThreadStatus.OPEN },
    });
    expect(mockBumpMetric).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
    expect(mockLogAction).not.toHaveBeenCalled();
    expect(mockDispatchStatusChanged).not.toHaveBeenCalled();
  });

  it("CAS miss + segunda leitura num status diferente → conflito após retries", async () => {
    mockPrisma.waInboxThread.findFirst
      .mockResolvedValueOnce({ status: WaInboxThreadStatus.CLOSED })
      .mockResolvedValueOnce({ status: WaInboxThreadStatus.PENDING })
      .mockResolvedValueOnce({ status: WaInboxThreadStatus.PENDING });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 0 });

    const { updateThreadStatus } = await import("../threadStatusService");
    const result = await updateThreadStatus(
      "tenant1",
      "thread1",
      WaInboxThreadStatus.OPEN,
      "user1"
    );

    expect(result).toEqual({ ok: false, reason: "conflict" });
    expect(mockPrisma.waInboxThread.updateMany).toHaveBeenCalledTimes(2);
    expect(mockPrisma.waInboxThread.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: "thread1",
        tenantId: "tenant1",
        status: WaInboxThreadStatus.CLOSED,
      },
      data: { status: WaInboxThreadStatus.OPEN },
    });
    expect(mockPrisma.waInboxThread.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: "thread1",
        tenantId: "tenant1",
        status: WaInboxThreadStatus.PENDING,
      },
      data: { status: WaInboxThreadStatus.OPEN },
    });
    expect(mockBumpMetric).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
    expect(mockLogAction).not.toHaveBeenCalled();
  });

  it("autoUpdateStatusOnNewMessage INBOUND reabre CLOSED via updateThreadStatus", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({ status: WaInboxThreadStatus.CLOSED });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 1 });

    const { autoUpdateStatusOnNewMessage } = await import("../threadStatusService");
    await autoUpdateStatusOnNewMessage("tenant1", "thread1", "INBOUND");

    expect(mockPrisma.waInboxThread.updateMany).toHaveBeenCalledWith({
      where: {
        id: "thread1",
        tenantId: "tenant1",
        status: WaInboxThreadStatus.CLOSED,
      },
      data: { status: WaInboxThreadStatus.OPEN },
    });
    expect(mockLogAction).toHaveBeenCalledWith(
      "tenant1",
      "thread1",
      "system",
      "status_change",
      {
        previousStatus: WaInboxThreadStatus.CLOSED,
        status: WaInboxThreadStatus.OPEN,
      }
    );
  });

  it("autoUpdateStatusOnNewMessage INBOUND em OPEN não dispara side effects", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({ status: WaInboxThreadStatus.OPEN });

    const { autoUpdateStatusOnNewMessage } = await import("../threadStatusService");
    await autoUpdateStatusOnNewMessage("tenant1", "thread1", "INBOUND");

    expect(mockPrisma.waInboxThread.updateMany).not.toHaveBeenCalled();
    expect(mockBumpMetric).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
    expect(mockLogAction).not.toHaveBeenCalled();
  });
});
