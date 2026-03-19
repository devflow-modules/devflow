/**
 * Tags por tenant e associação thread ↔ tag.
 * Isolado por tenant.
 */

import { prisma } from "@/lib/prisma";

export async function createTag(
  tenantId: string,
  params: { name: string; color?: string }
): Promise<{ id: string; name: string; color: string } | null> {
  const name = params.name.trim();
  if (!name) return null;
  const color = params.color?.trim() || "#6b7280";
  const tag = await prisma.waInboxTag.create({
    data: { tenantId, name, color },
  });
  return { id: tag.id, name: tag.name, color: tag.color };
}

export async function listTagsByTenant(tenantId: string) {
  return prisma.waInboxTag.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
}

export async function assignTagToThread(
  tenantId: string,
  threadId: string,
  tagId: string
): Promise<boolean> {
  const [thread, tag] = await Promise.all([
    prisma.waInboxThread.findFirst({ where: { id: threadId, tenantId }, select: { id: true } }),
    prisma.waInboxTag.findFirst({ where: { id: tagId, tenantId }, select: { id: true } }),
  ]);
  if (!thread || !tag) return false;
  await prisma.waInboxThreadTag.upsert({
    where: { threadId_tagId: { threadId, tagId } },
    create: { tenantId, threadId, tagId },
    update: {},
  });
  return true;
}

export async function removeTagFromThread(
  tenantId: string,
  threadId: string,
  tagId: string
): Promise<boolean> {
  const deleted = await prisma.waInboxThreadTag.deleteMany({
    where: { threadId, tagId, tenantId },
  });
  return deleted.count > 0;
}

export async function getTagsForThread(tenantId: string, threadId: string) {
  const rows = await prisma.waInboxThreadTag.findMany({
    where: { tenantId, threadId },
    include: { tag: true },
  });
  return rows.map((r) => ({ id: r.tag.id, name: r.tag.name, color: r.tag.color }));
}
