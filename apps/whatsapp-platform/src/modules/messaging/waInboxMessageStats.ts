/**
 * Métricas de mensagens — fonte canónica: wa_inbox_messages (Prisma).
 */

import { prisma } from "@/lib/prisma";

export async function countMessagesLast24h(tenantId?: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.waInboxMessage.count({
    where: {
      ...(tenantId ? { tenantId } : {}),
      createdAt: { gte: since },
    },
  });
}
