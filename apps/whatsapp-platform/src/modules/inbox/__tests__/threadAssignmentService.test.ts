import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  user: { findFirst: vi.fn(), findMany: vi.fn() },
  waInboxThread: { updateMany: vi.fn(), findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("threadAssignmentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assignThread retorna true quando thread e usuário existem", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "u1" });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 1 });
    const { assignThread } = await import("../threadAssignmentService");
    const ok = await assignThread("tenant1", "thread1", "u1");
    expect(ok).toBe(true);
    expect(mockPrisma.waInboxThread.updateMany).toHaveBeenCalledWith({
      where: { id: "thread1", tenantId: "tenant1" },
      data: { assignedToUserId: "u1" },
    });
  });

  it("assignThread retorna false quando usuário não é do tenant", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    const { assignThread } = await import("../threadAssignmentService");
    const ok = await assignThread("tenant1", "thread1", "u-other");
    expect(ok).toBe(false);
    expect(mockPrisma.waInboxThread.updateMany).not.toHaveBeenCalled();
  });

  it("unassignThread limpa assignedToUserId", async () => {
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 1 });
    const { unassignThread } = await import("../threadAssignmentService");
    const ok = await unassignThread("tenant1", "thread1");
    expect(ok).toBe(true);
    expect(mockPrisma.waInboxThread.updateMany).toHaveBeenCalledWith({
      where: { id: "thread1", tenantId: "tenant1" },
      data: { assignedToUserId: null },
    });
  });
});
