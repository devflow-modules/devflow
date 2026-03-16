import { prisma } from "../lib/prisma.js";
import { messageService } from "./MessageService.js";

export type ConversationContext = {
  conversationId: string;
  tenantId: string;
  externalId: string;
  recentMessages: { sender: string; messageType: string; content: string; timestamp: Date }[];
};

export type ProcessInboundInput = {
  tenantId: string;
  externalId: string; // wa_id (phone)
  sender: string;
  messageType: string;
  content: string;
  messageTimestamp?: Date;
};

export class ConversationService {
  async findOrCreate(tenantId: string, externalId: string) {
    const normalized = externalId.replace(/\D/g, "");
    return prisma.conversation.upsert({
      where: {
        tenantId_externalId: { tenantId, externalId: normalized },
      },
      create: {
        tenantId,
        externalId: normalized,
      },
      update: { updatedAt: new Date() },
    });
  }

  /** List conversations for a tenant (tenant-scoped). */
  async listByTenant(tenantId: string, limit = 50) {
    return prisma.conversation.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: { _count: { select: { messages: true } } },
    });
  }

  async processInbound(input: ProcessInboundInput): Promise<ConversationContext> {
    const conversation = await this.findOrCreate(input.tenantId, input.externalId);

    await messageService.create({
      conversationId: conversation.id,
      sender: input.sender,
      messageType: input.messageType,
      content: input.content,
      timestamp: input.messageTimestamp,
    });

    const recentMessages = await messageService.listByConversation(conversation.id);

    return {
      conversationId: conversation.id,
      tenantId: conversation.tenantId,
      externalId: conversation.externalId,
      recentMessages: recentMessages.map((m) => ({
        sender: m.sender,
        messageType: m.messageType,
        content: m.content,
        timestamp: m.timestamp,
      })),
    };
  }
}

export const conversationService = new ConversationService();
