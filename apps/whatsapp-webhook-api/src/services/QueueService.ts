import { prisma } from "../lib/prisma.js";

export type EnqueueInput = {
  tenantId: string;
  conversationId: string;
  priority?: number;
};

export class QueueService {
  async enqueue(input: EnqueueInput) {
    return prisma.conversationQueue.create({
      data: {
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        priority: input.priority ?? 0,
      },
    });
  }

  async listByTenant(tenantId: string, limit = 50) {
    return prisma.conversationQueue.findMany({
      where: { tenantId },
      orderBy: [{ priority: "desc" }, { queuedAt: "asc" }],
      take: limit,
      include: { conversation: true },
    });
  }

  async removeFromQueue(conversationId: string) {
    await prisma.conversationQueue.deleteMany({
      where: { conversationId },
    });
  }

  async findNextInQueue(tenantId: string) {
    return prisma.conversationQueue.findFirst({
      where: { tenantId },
      orderBy: [{ priority: "desc" }, { queuedAt: "asc" }],
      include: { conversation: true },
    });
  }

  /**
   * Remove e retorna a próxima conversa da fila (maior prioridade, mais antiga).
   * Retorna null se a fila estiver vazia.
   */
  async dequeue(tenantId: string) {
    const entry = await this.findNextInQueue(tenantId);
    if (!entry) return null;
    await this.removeFromQueue(entry.conversationId);
    return entry;
  }

  async setAgentStatus(tenantId: string, userId: string, status: string, currentConversationId?: string | null) {
    return prisma.agentStatus.upsert({
      where: {
        tenantId_userId: { tenantId, userId },
      },
      create: {
        tenantId,
        userId,
        status,
        currentConversationId: currentConversationId ?? null,
      },
      update: {
        status,
        currentConversationId: currentConversationId ?? undefined,
        updatedAt: new Date(),
      },
    });
  }

  async findAvailableAgent(tenantId: string) {
    return prisma.agentStatus.findFirst({
      where: { tenantId, status: "available" },
    });
  }

  async assignConversationToAgent(tenantId: string, conversationId: string, userId: string) {
    await this.removeFromQueue(conversationId);
    await this.setAgentStatus(tenantId, userId, "busy", conversationId);
  }
}

export const queueService = new QueueService();
