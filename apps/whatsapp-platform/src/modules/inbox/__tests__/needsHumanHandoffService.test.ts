import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  WaInboxThreadPriority,
  WaInboxThreadStatus,
} from "@/generated/prisma-whatsapp";

const assignThread = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const assignTagToThread = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const logAction = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const publishInboxEvent = vi.hoisted(() => vi.fn());

vi.mock("../threadAssignmentService", () => ({
  assignThread: (...args: unknown[]) => assignThread(...args),
}));

vi.mock("../tagService", () => ({
  assignTagToThread: (...args: unknown[]) => assignTagToThread(...args),
}));

vi.mock("../auditService", () => ({
  logAction: (...args: unknown[]) => logAction(...args),
}));

vi.mock("@/modules/realtime/realtime.service", () => ({
  publishInboxEvent: (...args: unknown[]) => publishInboxEvent(...args),
  eventConversationStatusChanged: vi.fn((_t: string, p: unknown) => p),
  eventConversationPriorityChanged: vi.fn((_t: string, p: unknown) => p),
}));

vi.mock("@/lib/observability", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/observability")>();
  return {
    ...actual,
    logEvent: vi.fn(),
    logWhatsappPilotEvent: vi.fn(),
  };
});

const mockPrisma = {
  waInboxThread: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  user: { findFirst: vi.fn() },
  waInboxQueue: { findFirst: vi.fn() },
  waInboxTag: { findFirst: vi.fn(), create: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("applyNeedsHumanHandoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.WHATSAPP_HANDOFF_DEFAULT_USER_ID;
    delete process.env.WHATSAPP_HANDOFF_DEFAULT_QUEUE_SLUG;
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({
      id: "thread-1",
      status: WaInboxThreadStatus.OPEN,
      priority: WaInboxThreadPriority.MEDIUM,
      assignedToUserId: null,
      queueId: null,
    });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.waInboxQueue.findFirst.mockResolvedValue(null);
    mockPrisma.waInboxTag.findFirst.mockResolvedValue({ id: "tag-1" });
  });

  it("marca thread PENDING + HIGH e regista audit", async () => {
    const { applyNeedsHumanHandoff } = await import("../needsHumanHandoffService");
    const result = await applyNeedsHumanHandoff({
      tenantId: "tenant-a",
      threadId: "thread-1",
      reason: "llm_needs_human",
      inboundWaMessageId: "wam-in-1",
    });

    expect(result.applied).toBe(true);
    expect(mockPrisma.waInboxThread.updateMany).toHaveBeenCalledWith({
      where: { id: "thread-1", tenantId: "tenant-a" },
      data: {
        status: WaInboxThreadStatus.PENDING,
        priority: WaInboxThreadPriority.HIGH,
      },
    });
    expect(logAction).toHaveBeenCalledWith(
      "tenant-a",
      "thread-1",
      "automation",
      "handoff_requested",
      expect.objectContaining({ reason: "llm_needs_human", inboundWaMessageId: "wam-in-1" })
    );
    expect(assignTagToThread).toHaveBeenCalledWith("tenant-a", "thread-1", "tag-1");
  });

  it("não altera assignee quando thread já está atribuída", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({
      id: "thread-1",
      status: WaInboxThreadStatus.OPEN,
      priority: WaInboxThreadPriority.MEDIUM,
      assignedToUserId: "user-manual",
      queueId: null,
    });

    const { applyNeedsHumanHandoff } = await import("../needsHumanHandoffService");
    const result = await applyNeedsHumanHandoff({
      tenantId: "tenant-a",
      threadId: "thread-1",
      reason: "llm_needs_human",
    });

    expect(result.assignedToUserId).toBe("user-manual");
    expect(assignThread).not.toHaveBeenCalled();
  });

  it("atribui manager default quando sem assignee", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "mgr-1" });

    const { applyNeedsHumanHandoff } = await import("../needsHumanHandoffService");
    const result = await applyNeedsHumanHandoff({
      tenantId: "tenant-a",
      threadId: "thread-1",
      reason: "handoff_trigger_keyword",
    });

    expect(assignThread).toHaveBeenCalledWith("tenant-a", "thread-1", "mgr-1", "automation");
    expect(result.assignedToUserId).toBe("mgr-1");
  });

  it("rejeita thread de outro tenant (updateMany 0)", async () => {
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 0 });

    const { applyNeedsHumanHandoff } = await import("../needsHumanHandoffService");
    const result = await applyNeedsHumanHandoff({
      tenantId: "tenant-b",
      threadId: "thread-1",
      reason: "llm_needs_human",
    });

    expect(result.applied).toBe(false);
    expect(assignThread).not.toHaveBeenCalled();
  });
});
