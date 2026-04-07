/**
 * Fila de distribuição — apenas `wa_inbox_threads` (OPEN/PENDING, sem atribuição).
 */

import { prisma } from "@/lib/prisma";
import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";

export async function findNextUnassignedQueueThread(tenantId: string) {
  return prisma.waInboxThread.findFirst({
    where: {
      tenantId,
      status: { in: [WaInboxThreadStatus.OPEN, WaInboxThreadStatus.PENDING] },
      assignedToUserId: null,
    },
    orderBy: { lastMessageAt: "asc" },
    include: {
      messages: {
        orderBy: { ts: "desc" },
        take: 20,
      },
    },
  });
}

export async function listPendingQueueThreads(tenantId: string, take = 100) {
  return prisma.waInboxThread.findMany({
    where: {
      tenantId,
      status: { in: [WaInboxThreadStatus.OPEN, WaInboxThreadStatus.PENDING] },
      assignedToUserId: null,
    },
    orderBy: { lastMessageAt: "asc" },
    take,
    select: {
      id: true,
      phoneNumber: true,
      contactName: true,
      lastMessageAt: true,
      lastMessagePreview: true,
      status: true,
    },
  });
}
