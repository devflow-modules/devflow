import { prisma } from "../lib/prisma.js";

export type CreateMessageInput = {
  conversationId: string;
  sender: string;
  messageType: string;
  content: string;
  timestamp?: Date;
  responseTimeMs?: number;
  agentId?: string;
  intent?: string;
};

export type ListByConversationOptions = {
  tenantId?: string;
  limit?: number;
};

export class MessageService {
  async create(input: CreateMessageInput) {
    return prisma.message.create({
      data: {
        conversationId: input.conversationId,
        sender: input.sender,
        messageType: input.messageType,
        content: input.content,
        timestamp: input.timestamp ?? new Date(),
        responseTimeMs: input.responseTimeMs ?? undefined,
        agentId: input.agentId ?? undefined,
        intent: input.intent ?? undefined,
      },
    });
  }

  /**
   * List messages for a conversation. If tenantId is provided, verifies the conversation belongs to that tenant.
   * @param conversationId - Conversation ID
   * @param optionsOrLimit - Options { tenantId?, limit? } or legacy limit number
   */
  async listByConversation(
    conversationId: string,
    optionsOrLimit: ListByConversationOptions | number = {}
  ) {
    const options: ListByConversationOptions =
      typeof optionsOrLimit === "number"
        ? { limit: optionsOrLimit }
        : optionsOrLimit;
    const { tenantId, limit = 50 } = options;
    const where: { conversationId: string; conversation?: { tenantId: string } } = {
      conversationId,
    };
    if (tenantId) {
      where.conversation = { tenantId };
    }
    return prisma.message.findMany({
      where,
      orderBy: { timestamp: "asc" },
      take: limit,
    });
  }
}

export const messageService = new MessageService();
