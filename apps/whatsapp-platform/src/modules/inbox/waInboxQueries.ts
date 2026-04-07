import {
  WaInboxThreadStatus,
  type Prisma,
} from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";

export type WaInboxThreadFilters = {
  status?: WaInboxThreadStatus;
  assignedTo?: string; // userId or "unassigned" | "me"
  tag?: string; // tagId
  priority?: string;
  /** Meta phone_number_id da linha WhatsApp */
  businessPhoneNumberId?: string;
};

export async function waInboxListThreads(
  tenantId: string,
  opts: { take: number; skip: number; filters?: WaInboxThreadFilters; currentUserId?: string }
) {
  const where: Prisma.WaInboxThreadWhereInput = { tenantId };

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

  if (opts.filters?.businessPhoneNumberId?.trim()) {
    where.businessPhoneNumberId = opts.filters.businessPhoneNumberId.trim();
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
  const where: Prisma.WaInboxThreadWhereInput = { tenantId };
  if (filters?.status) where.status = filters.status;
  if (filters?.priority) where.priority = filters.priority as "LOW" | "MEDIUM" | "HIGH";
  if (filters?.assignedTo === "unassigned") where.assignedToUserId = null;
  else if (filters?.assignedTo === "me" && currentUserId) where.assignedToUserId = currentUserId;
  else if (filters?.assignedTo) where.assignedToUserId = filters.assignedTo;
  if (filters?.tag) where.threadTags = { some: { tagId: filters.tag, tenantId } };
  if (filters?.businessPhoneNumberId?.trim()) {
    where.businessPhoneNumberId = filters.businessPhoneNumberId.trim();
  }
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

export type WhatsappLineSummary = {
  phoneNumberId: string;
  label: string | null;
  displayPhoneNumber: string | null;
  isPrimary: boolean;
  isDefaultOutbound: boolean;
};

export async function fetchWhatsappLineSummaries(
  tenantId: string,
  metaPhoneNumberIds: string[]
): Promise<Map<string, WhatsappLineSummary>> {
  const ids = [...new Set(metaPhoneNumberIds.map((x) => x.trim()).filter(Boolean))];
  if (ids.length === 0) return new Map();
  const rows = await prisma.whatsappPhoneNumber.findMany({
    where: { tenantId, phoneNumberId: { in: ids } },
    select: {
      phoneNumberId: true,
      label: true,
      displayPhoneNumber: true,
      isPrimary: true,
      isDefaultOutbound: true,
    },
  });
  return new Map(
    rows.map((r) => [
      r.phoneNumberId,
      {
        phoneNumberId: r.phoneNumberId,
        label: r.label,
        displayPhoneNumber: r.displayPhoneNumber,
        isPrimary: r.isPrimary,
        isDefaultOutbound: r.isDefaultOutbound,
      },
    ])
  );
}
