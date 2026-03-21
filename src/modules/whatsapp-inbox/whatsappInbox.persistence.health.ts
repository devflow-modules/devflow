import type { PrismaClient } from "@prisma/client";

export async function getInboxPersistenceHealth(prisma: PrismaClient): Promise<{
  persistenceOk: boolean;
  messagesStored: number;
  lastMessageStoredAt: string | null;
}> {
  try {
    const [agg] = await prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c FROM "WhatsappInboxMessage"
    `;
    const count = Number(agg?.c ?? 0);
    const last = await prisma.whatsappInboxMessage.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    return {
      persistenceOk: true,
      messagesStored: count,
      lastMessageStoredAt: last?.createdAt.toISOString() ?? null,
    };
  } catch {
    return {
      persistenceOk: false,
      messagesStored: 0,
      lastMessageStoredAt: null,
    };
  }
}
