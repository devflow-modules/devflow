import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  user: { findFirst: vi.fn(), findMany: vi.fn() },
  waInboxThread: { updateMany: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  agentStatus: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  waInboxAuditLog: { create: vi.fn().mockResolvedValue({}) },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("threadAssignmentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assignThread retorna true quando thread e usuário existem", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "u1" });
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({ assignedToUserId: null });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.agentStatus.upsert.mockResolvedValue({});
    const { assignThread } = await import("../threadAssignmentService");
    const ok = await assignThread("tenant1", "thread1", "u1");
    expect(ok).toBe(true);
    expect(mockPrisma.waInboxThread.updateMany).toHaveBeenCalledWith({
      where: { id: "thread1", tenantId: "tenant1" },
      data: { assignedToUserId: "u1" },
    });
    expect(mockPrisma.agentStatus.upsert).toHaveBeenCalled();
  });

  it("assignThread retorna false quando usuário não é do tenant", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    const { assignThread } = await import("../threadAssignmentService");
    const ok = await assignThread("tenant1", "thread1", "u-other");
    expect(ok).toBe(false);
    expect(mockPrisma.waInboxThread.updateMany).not.toHaveBeenCalled();
  });

  it("unassignThread limpa assignedToUserId e liberta presença quando aplicável", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({ assignedToUserId: "u1" });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.agentStatus.findUnique.mockResolvedValue({
      tenantId: "tenant1",
      currentConversationId: "thread1",
    });
    mockPrisma.agentStatus.update.mockResolvedValue({});
    const { unassignThread } = await import("../threadAssignmentService");
    const ok = await unassignThread("tenant1", "thread1");
    expect(ok).toBe(true);
    expect(mockPrisma.waInboxThread.updateMany).toHaveBeenCalledWith({
      where: { id: "thread1", tenantId: "tenant1" },
      data: { assignedToUserId: null },
    });
  });
});
