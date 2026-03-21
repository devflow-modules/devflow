import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/modules/financeiro/lib/db";

/** Transaction client type from actual Prisma instance (root schema with WhatsappConversation). */
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function findOrCreateConversationForInbound(
  tx: Tx,
  params: {
    phoneNumber: string;
    contactName?: string | null;
    lastMessageAt: Date;
    lastMessagePreview: string | null;
  }
) {
  const { phoneNumber, contactName, lastMessageAt, lastMessagePreview } = params;
  const existing = await tx.whatsappConversation.findUnique({
    where: { phoneNumber },
  });
  if (existing) {
    return tx.whatsappConversation.update({
      where: { id: existing.id },
      data: {
        ...(contactName != null && contactName !== "" ? { contactName } : {}),
        lastMessageAt,
        ...(lastMessagePreview != null ? { lastMessagePreview } : {}),
        unreadCount: { increment: 1 },
      },
    });
  }
  return tx.whatsappConversation.create({
    data: {
      phoneNumber,
      contactName: contactName ?? null,
      lastMessageAt,
      lastMessagePreview,
      unreadCount: 1,
    },
  });
}

export async function touchConversationAfterOutbound(
  tx: Tx,
  params: {
    customerPhone: string;
    lastMessageAt: Date;
    lastMessagePreview: string | null;
  }
) {
  const { customerPhone, lastMessageAt, lastMessagePreview } = params;
  await tx.whatsappConversation.upsert({
    where: { phoneNumber: customerPhone },
    create: {
      phoneNumber: customerPhone,
      lastMessageAt,
      lastMessagePreview,
      unreadCount: 0,
    },
    update: {
      lastMessageAt,
      lastMessagePreview: lastMessagePreview ?? undefined,
    },
  });
}

export async function listConversations(
  prisma: PrismaClient,
  opts: { take?: number; skip?: number } = {}
) {
  const take = Math.min(opts.take ?? 50, 200);
  const skip = opts.skip ?? 0;
  return prisma.whatsappConversation.findMany({
    orderBy: { lastMessageAt: "desc" },
    take,
    skip,
  });
}

export async function getConversationById(prisma: PrismaClient, id: string) {
  return prisma.whatsappConversation.findUnique({
    where: { id },
  });
}

export async function countConversations(prisma: PrismaClient): Promise<number> {
  return prisma.whatsappConversation.count();
}
