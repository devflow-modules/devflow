import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";

export type WaInboxThreadFilters = {
  status?: WaInboxThreadStatus;
  assignedTo?: string; // userId or "unassigned" | "me"
  tag?: string; // tagId
  priority?: string;
};

export async function waInboxListThreads(
  tenantId: string,
  opts: { take: number; skip: number; filters?: WaInboxThreadFilters; currentUserId?: string }
) {
  const where: Parameters<typeof prisma.waInboxThread.findMany>[0]["where"] = { tenantId };

  if (opts.filters?.status) where.status = opts.filters.status;
  if (opts.filters?.priority) where.priority = opts.filters.priority as "LOW" | "MEDIUM" | "HIGH";

  if (opts.filters?.assignedTo !== undefined) {
    if (opts.filters.assignedTo === "unassigned") {
      where.assignedToUserId = null;
    } else if (opts.filters.assignedTo === "me" && opts.currentUserId) {
      where.assignedToUserId = opts.currentUserId;
    } else if (opts.filters.assignedTo) {
      where.assignedToUserId = opts.filters.assignedTo;
    }
  }

  if (opts.filters?.tag) {
    where.threadTags = { some: { tagId: opts.filters.tag, tenantId } };
  }

  return prisma.waInboxThread.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: opts.take,
    skip: opts.skip,
    include: {
      assignedToUser: { select: { id: true, name: true, email: true } },
      threadTags: { include: { tag: true } },
    },
  });
}

export async function waInboxCountThreads(
  tenantId: string,
  filters?: WaInboxThreadFilters,
  currentUserId?: string
): Promise<number> {
  const where: Parameters<typeof prisma.waInboxThread.count>[0]["where"] = { tenantId };
  if (filters?.status) where.status = filters.status;
  if (filters?.priority) where.priority = filters.priority as "LOW" | "MEDIUM" | "HIGH";
  if (filters?.assignedTo === "unassigned") where.assignedToUserId = null;
  else if (filters?.assignedTo === "me" && currentUserId) where.assignedToUserId = currentUserId;
  else if (filters?.assignedTo) where.assignedToUserId = filters.assignedTo;
  if (filters?.tag) where.threadTags = { some: { tagId: filters.tag, tenantId } };
  return prisma.waInboxThread.count({ where });
}

export async function waInboxGetThread(tenantId: string, threadId: string) {
  return prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    include: {
      assignedToUser: { select: { id: true, name: true, email: true } },
      threadTags: { include: { tag: true } },
    },
  });
}
