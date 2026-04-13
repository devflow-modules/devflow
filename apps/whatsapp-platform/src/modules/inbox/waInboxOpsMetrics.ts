/**
 * Métricas operacionais — fonte única: Prisma (`wa_inbox_*`, `tenants`).
 * Substitui contagens via Supabase `conversations` / `messages` legadas.
 */

import { prisma } from "@/lib/prisma";

/** Total de threads de inbox no sistema (todos os tenants). */
export async function countInboxThreadsTotal(): Promise<number> {
  return prisma.waInboxThread.count();
}

/** Total de tenants registados (Prisma). */
export async function countTenantsTotal(): Promise<number> {
  return prisma.tenant.count();
}

export type InboxThreadExportRow = {
  id: string;
  phoneNumber: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
};

/** Threads criadas no intervalo (export CSV). */
export async function listInboxThreadsCreatedInRange(
  tenantId: string,
  from: Date,
  to: Date
): Promise<InboxThreadExportRow[]> {
  const rows = await prisma.waInboxThread.findMany({
    where: {
      tenantId,
      createdAt: { gte: from, lte: to },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      phoneNumber: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      lastMessageAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    phoneNumber: r.phoneNumber,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    lastMessageAt: r.lastMessageAt,
  }));
}

export type InboxMessageExportRow = {
  id: string;
  threadId: string;
  direction: string;
  body: string | null;
  createdAt: Date;
};

/** Mensagens criadas no intervalo (export CSV). */
export async function listInboxMessagesCreatedInRange(
  tenantId: string,
  from: Date,
  to: Date,
  take = 10_000
): Promise<InboxMessageExportRow[]> {
  const rows = await prisma.waInboxMessage.findMany({
    where: {
      tenantId,
      createdAt: { gte: from, lte: to },
    },
    orderBy: { createdAt: "asc" },
    take,
    select: {
      id: true,
      threadId: true,
      direction: true,
      contentText: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    threadId: r.threadId,
    direction: r.direction,
    body: r.contentText,
    createdAt: r.createdAt,
  }));
}

/** Lista recenta para dashboard (substitui Supabase `listConversations`). */
export async function listRecentInboxThreadsForTenant(tenantId: string, limit: number) {
  return prisma.waInboxThread.findMany({
    where: { tenantId },
    orderBy: { lastMessageAt: "desc" },
    take: limit,
    select: {
      id: true,
      phoneNumber: true,
      status: true,
      lastMessageAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
