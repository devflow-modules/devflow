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
  tagId: string,
  callerUserId?: string
): Promise<boolean> {
  const [thread, tag] = await Promise.all([
    prisma.waInboxThread.findFirst({ where: { id: threadId, tenantId }, select: { id: true } }),
    prisma.waInboxTag.findFirst({ where: { id: tagId, tenantId }, select: { id: true, name: true, color: true } }),
  ]);
  if (!thread || !tag) return false;
  await prisma.waInboxThreadTag.upsert({
    where: { threadId_tagId: { threadId, tagId } },
    create: { tenantId, threadId, tagId },
    update: {},
  });
  const tags = await getTagsForThread(tenantId, threadId);
  const { publishInboxEvent, eventConversationTagsChanged } = await import("@/modules/realtime/realtime.service");
  publishInboxEvent(tenantId, eventConversationTagsChanged(tenantId, { threadId, tags }));
  if (callerUserId) {
    const { logAction } = await import("./auditService");
    await logAction(tenantId, threadId, callerUserId, "tag_add", { tagId, tagName: tag.name });
  }
  const { dispatchTagAdded } = await import("@/modules/automation");
  dispatchTagAdded(tenantId, threadId, tagId, tag.name).catch((e) =>
    console.error("[tag] automation dispatch tag_add", e)
  );
  return true;
}

export async function removeTagFromThread(
  tenantId: string,
  threadId: string,
  tagId: string,
  callerUserId?: string
): Promise<boolean> {
  const tag = await prisma.waInboxTag.findFirst({ where: { id: tagId, tenantId }, select: { name: true } });
  const deleted = await prisma.waInboxThreadTag.deleteMany({
    where: { threadId, tagId, tenantId },
  });
  if (deleted.count > 0) {
    const tags = await getTagsForThread(tenantId, threadId);
    const { publishInboxEvent, eventConversationTagsChanged } = await import("@/modules/realtime/realtime.service");
    publishInboxEvent(tenantId, eventConversationTagsChanged(tenantId, { threadId, tags }));
    if (callerUserId) {
      const { logAction } = await import("./auditService");
      await logAction(tenantId, threadId, callerUserId, "tag_remove", { tagId, tagName: tag?.name });
    }
    const { dispatchTagRemoved } = await import("@/modules/automation");
    dispatchTagRemoved(tenantId, threadId, tagId).catch((e) =>
      console.error("[tag] automation dispatch tag_remove", e)
    );
  }
  return deleted.count > 0;
}

export async function getTagsForThread(tenantId: string, threadId: string) {
  const rows = await prisma.waInboxThreadTag.findMany({
    where: { tenantId, threadId },
    include: { tag: true },
  });
  return rows.map((r) => ({ id: r.tag.id, name: r.tag.name, color: r.tag.color }));
}
