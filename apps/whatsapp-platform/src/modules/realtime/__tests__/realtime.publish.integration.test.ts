import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Testes de integração: verifica que os serviços publicam eventos
 * após persistência bem-sucedida.
 */

const mockPublish = vi.fn();
vi.mock("../realtime.service", () => ({
  publishInboxEvent: (...args: unknown[]) => mockPublish(...args),
  eventMessageCreated: vi.fn((_t: string, p: unknown) => ({
    type: "message.created",
    tenantId: _t,
    ts: new Date().toISOString(),
    payload: p,
  })),
  eventMessageStatusUpdated: vi.fn((_t: string, p: unknown) => ({
    type: "message.status_updated",
    tenantId: _t,
    ts: new Date().toISOString(),
    payload: p,
  })),
  eventConversationAssigned: vi.fn((_t: string, p: unknown) => ({
    type: "conversation.assigned",
    tenantId: _t,
    ts: new Date().toISOString(),
    payload: p,
  })),
  eventConversationStatusChanged: vi.fn((_t: string, p: unknown) => ({
    type: "conversation.status_changed",
    tenantId: _t,
    ts: new Date().toISOString(),
    payload: p,
  })),
  eventConversationTagsChanged: vi.fn((_t: string, p: unknown) => ({
    type: "conversation.tags_changed",
    tenantId: _t,
    ts: new Date().toISOString(),
    payload: p,
  })),
}));

const mockPrisma = {
  user: { findFirst: vi.fn(), findMany: vi.fn() },
  waInboxThread: { updateMany: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  agentStatus: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  waInboxTag: { findFirst: vi.fn(), findMany: vi.fn() },
  waInboxThreadTag: { upsert: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
  waInboxAuditLog: { create: vi.fn().mockResolvedValue({}) },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("realtime publish integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assignThread publica conversation.assigned", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "u1",
      name: "User 1",
      email: "u1@test.com",
    });
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({ assignedToUserId: null });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.agentStatus.upsert.mockResolvedValue({});

    const { assignThread } = await import("@/modules/inbox/threadAssignmentService");
    await assignThread("tenant1", "thread1", "u1");

    expect(mockPublish).toHaveBeenCalledTimes(1);
    expect(mockPublish).toHaveBeenCalledWith(
      "tenant1",
      expect.objectContaining({
        type: "conversation.assigned",
        payload: expect.objectContaining({
          threadId: "thread1",
          assignedToUserId: "u1",
        }),
      })
    );
  });

  it("unassignThread publica conversation.assigned com null", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({ assignedToUserId: "u1" });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.agentStatus.findUnique.mockResolvedValue({
      tenantId: "tenant1",
      currentConversationId: "thread1",
    });
    mockPrisma.agentStatus.update.mockResolvedValue({});

    const { unassignThread } = await import("@/modules/inbox/threadAssignmentService");
    await unassignThread("tenant1", "thread1");

    expect(mockPublish).toHaveBeenCalledWith(
      "tenant1",
      expect.objectContaining({
        type: "conversation.assigned",
        payload: expect.objectContaining({
          threadId: "thread1",
          assignedToUserId: null,
        }),
      })
    );
  });

  it("updateThreadStatus publica conversation.status_changed", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({ status: "OPEN" });
    mockPrisma.waInboxThread.updateMany.mockResolvedValue({ count: 1 });

    const { updateThreadStatus } = await import("@/modules/inbox/threadStatusService");
    await updateThreadStatus("tenant1", "thread1", "CLOSED");

    expect(mockPublish).toHaveBeenCalledWith(
      "tenant1",
      expect.objectContaining({
        type: "conversation.status_changed",
        payload: { threadId: "thread1", status: "CLOSED" },
      })
    );
  });

  it("updateThreadStatus não publica em transição idempotente", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({ status: "CLOSED" });

    const { updateThreadStatus } = await import("@/modules/inbox/threadStatusService");
    await updateThreadStatus("tenant1", "thread1", "CLOSED");

    expect(mockPrisma.waInboxThread.updateMany).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("assignTagToThread publica conversation.tags_changed", async () => {
    mockPrisma.waInboxThread.findFirst.mockResolvedValue({ id: "thread1" });
    mockPrisma.waInboxTag.findFirst.mockResolvedValue({
      id: "tag1",
      name: "Tag1",
      color: "#333",
    });
    mockPrisma.waInboxThreadTag.upsert.mockResolvedValue({});
    mockPrisma.waInboxThreadTag.findMany.mockResolvedValue([
      {
        tag: { id: "tag1", name: "Tag1", color: "#333" },
      },
    ]);

    const { assignTagToThread } = await import("@/modules/inbox/tagService");
    await assignTagToThread("tenant1", "thread1", "tag1");

    expect(mockPublish).toHaveBeenCalledWith(
      "tenant1",
      expect.objectContaining({
        type: "conversation.tags_changed",
        payload: expect.objectContaining({
          threadId: "thread1",
          tags: expect.arrayContaining([expect.objectContaining({ id: "tag1" })]),
        }),
      })
    );
  });
});
