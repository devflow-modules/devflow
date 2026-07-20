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

  it("CLOSED → OPEN atualiza, audita com previousStatus e dispara side effects", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({ status: WaInboxThreadStatus.CLOSED });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 1 });

    const { updateThreadStatus } = await import("../threadStatusService");
    const ok = await updateThreadStatus("tenant1", "thread1", WaInboxThreadStatus.OPEN, "user1");

    expect(ok).toBe(true);
    expect(mockPrisma.waInboxThread.findFirst).toHaveBeenCalledWith({
      where: { id: "thread1", tenantId: "tenant1" },
      select: { status: true },
    });
    expect(mockPrisma.waInboxThread.updateMany).toHaveBeenCalledWith({
      where: { id: "thread1", tenantId: "tenant1" },
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
    const ok = await updateThreadStatus("tenant1", "thread1", WaInboxThreadStatus.OPEN, "user1");

    expect(ok).toBe(true);
    expect(mockPrisma.waInboxThread.updateMany).not.toHaveBeenCalled();
    expect(mockBumpMetric).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
    expect(mockLogAction).not.toHaveBeenCalled();
    expect(mockDispatchStatusChanged).not.toHaveBeenCalled();
  });

  it("retorna false quando thread não existe no tenant", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue(null);

    const { updateThreadStatus } = await import("../threadStatusService");
    const ok = await updateThreadStatus("tenant1", "missing", WaInboxThreadStatus.CLOSED, "user1");

    expect(ok).toBe(false);
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

  it("autoUpdateStatusOnNewMessage INBOUND reabre CLOSED via updateThreadStatus", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({ status: WaInboxThreadStatus.CLOSED });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 1 });

    const { autoUpdateStatusOnNewMessage } = await import("../threadStatusService");
    await autoUpdateStatusOnNewMessage("tenant1", "thread1", "INBOUND");

    expect(mockPrisma.waInboxThread.updateMany).toHaveBeenCalledWith({
      where: { id: "thread1", tenantId: "tenant1" },
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
