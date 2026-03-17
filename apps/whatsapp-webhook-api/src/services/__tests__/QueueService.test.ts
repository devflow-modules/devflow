import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  conversationQueue: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  agentStatus: {
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: mockPrisma,
}));

import { QueueService } from "../QueueService.js";

describe("QueueService", () => {
  let service: QueueService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new QueueService();
  });

  describe("enqueue", () => {
    it("insere corretamente com tenantId, conversationId e priority", async () => {
      const created = {
        id: "q1",
        tenantId: "t1",
        conversationId: "c1",
        priority: 1,
        queuedAt: new Date(),
      };
      mockPrisma.conversationQueue.create.mockResolvedValue(created);

      const result = await service.enqueue({
        tenantId: "t1",
        conversationId: "c1",
        priority: 1,
      });

      expect(mockPrisma.conversationQueue.create).toHaveBeenCalledWith({
        data: {
          tenantId: "t1",
          conversationId: "c1",
          priority: 1,
        },
      });
      expect(result).toEqual(created);
    });

    it("usa priority 0 quando não informada", async () => {
      mockPrisma.conversationQueue.create.mockResolvedValue({});

      await service.enqueue({
        tenantId: "t1",
        conversationId: "c1",
      });

      expect(mockPrisma.conversationQueue.create).toHaveBeenCalledWith({
        data: {
          tenantId: "t1",
          conversationId: "c1",
          priority: 0,
        },
      });
    });
  });

  describe("dequeue", () => {
    it("respeita prioridade e queuedAt (maior prioridade, mais antigo primeiro)", async () => {
      const entry = {
        id: "q1",
        tenantId: "t1",
        conversationId: "c1",
        priority: 2,
        queuedAt: new Date("2025-01-01T10:00:00Z"),
        conversation: { id: "c1" },
      };
      mockPrisma.conversationQueue.findFirst.mockResolvedValue(entry);
      mockPrisma.conversationQueue.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.dequeue("t1");

      expect(mockPrisma.conversationQueue.findFirst).toHaveBeenCalledWith({
        where: { tenantId: "t1" },
        orderBy: [{ priority: "desc" }, { queuedAt: "asc" }],
        include: { conversation: true },
      });
      expect(mockPrisma.conversationQueue.deleteMany).toHaveBeenCalledWith({
        where: { conversationId: "c1" },
      });
      expect(result).toEqual(entry);
    });

    it("retorna null quando fila vazia", async () => {
      mockPrisma.conversationQueue.findFirst.mockResolvedValue(null);

      const result = await service.dequeue("t1");

      expect(result).toBeNull();
      expect(mockPrisma.conversationQueue.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe("assignConversationToAgent", () => {
    it("remove da fila e marca agente como busy com currentConversationId", async () => {
      mockPrisma.conversationQueue.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.agentStatus.upsert.mockResolvedValue({});

      await service.assignConversationToAgent("t1", "c1", "u1");

      expect(mockPrisma.conversationQueue.deleteMany).toHaveBeenCalledWith({
        where: { conversationId: "c1" },
      });
      expect(mockPrisma.agentStatus.upsert).toHaveBeenCalledWith({
        where: { tenantId_userId: { tenantId: "t1", userId: "u1" } },
        create: {
          tenantId: "t1",
          userId: "u1",
          status: "busy",
          currentConversationId: "c1",
        },
        update: {
          status: "busy",
          currentConversationId: "c1",
          updatedAt: expect.any(Date),
        },
      });
    });
  });
});
