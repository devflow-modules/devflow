/**
 * Atribuição de conversas (threads) a usuários do tenant.
 * Isolado por tenant.
 */

import { prisma } from "@/lib/prisma";

export async function assignThread(
  tenantId: string,
  threadId: string,
  userId: string
): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: { id: true },
  });
  if (!user) return false;

  const updated = await prisma.waInboxThread.updateMany({
    where: { id: threadId, tenantId },
    data: { assignedToUserId: userId },
  });
  return updated.count > 0;
}

export async function unassignThread(tenantId: string, threadId: string): Promise<boolean> {
  const updated = await prisma.waInboxThread.updateMany({
    where: { id: threadId, tenantId },
    data: { assignedToUserId: null },
  });
  return updated.count > 0;
}

export async function getAssignedThreads(tenantId: string, userId: string) {
  return prisma.waInboxThread.findMany({
    where: { tenantId, assignedToUserId: userId },
    orderBy: { lastMessageAt: "desc" },
  });
}

export async function listUsersByTenant(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}
