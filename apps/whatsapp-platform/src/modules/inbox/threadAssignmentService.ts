/**
 * Atribuição de conversas (threads) a utilizadores do tenant.
 *
 * Fonte de verdade operacional: `WaInboxThread.assignedToUserId`.
 * Presença auxiliar (`whatsapp_agent_status`): ao atribuir, o interveniente fica `busy`
 * com `currentConversationId` = thread; ao libertar ou transferir, o anterior deixa de
 * apontar para essa thread quando aplicável. Ver `docs/architecture/CONVERSATION_OWNERSHIP_AND_HANDOFF.md`.
 */

import { prisma } from "@/lib/prisma";

async function syncAgentBusyOnThread(tenantId: string, userId: string, threadId: string): Promise<void> {
  await prisma.agentStatus.upsert({
    where: { userId },
    create: {
      tenantId,
      userId,
      status: "busy",
      currentConversationId: threadId,
    },
    update: {
      status: "busy",
      currentConversationId: threadId,
      updatedAt: new Date(),
    },
  });
}

/** Liberta `currentConversationId` quando ainda aponta para esta thread (ex.: libertar ou transferir). */
async function releaseAgentCurrentThreadIfMatches(
  tenantId: string,
  userId: string,
  threadId: string
): Promise<void> {
  const row = await prisma.agentStatus.findUnique({
    where: { userId },
    select: { tenantId: true, currentConversationId: true },
  });
  if (!row || row.tenantId !== tenantId || row.currentConversationId !== threadId) return;
  await prisma.agentStatus.update({
    where: { userId },
    data: {
      status: "available",
      currentConversationId: null,
      updatedAt: new Date(),
    },
  });
}

export async function assignThread(
  tenantId: string,
  threadId: string,
  userId: string,
  callerUserId?: string
): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: { id: true, name: true, email: true },
  });
  if (!user) return false;

  const before = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: { assignedToUserId: true },
  });
  if (!before) return false;

  const previousAssigneeId = before.assignedToUserId;

  const updated = await prisma.waInboxThread.updateMany({
    where: { id: threadId, tenantId },
    data: { assignedToUserId: userId },
  });
  if (updated.count === 0) return false;

  if (previousAssigneeId && previousAssigneeId !== userId) {
    await releaseAgentCurrentThreadIfMatches(tenantId, previousAssigneeId, threadId);
  }
  await syncAgentBusyOnThread(tenantId, userId, threadId);

  const { publishInboxEvent, eventConversationAssigned } = await import("@/modules/realtime/realtime.service");
  publishInboxEvent(tenantId, eventConversationAssigned(tenantId, { threadId, assignedToUserId: userId, assignedToUser: user }));
  const { logAction } = await import("./auditService");
  await logAction(tenantId, threadId, callerUserId ?? userId, "assign", { assignedToUserId: userId });
  return true;
}

export async function unassignThread(
  tenantId: string,
  threadId: string,
  callerUserId?: string
): Promise<boolean> {
  const before = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: { assignedToUserId: true },
  });
  if (!before) return false;

  const previousAssigneeId = before.assignedToUserId;

  const updated = await prisma.waInboxThread.updateMany({
    where: { id: threadId, tenantId },
    data: { assignedToUserId: null },
  });
  if (updated.count === 0) return false;

  if (previousAssigneeId) {
    await releaseAgentCurrentThreadIfMatches(tenantId, previousAssigneeId, threadId);
  }

  const { publishInboxEvent, eventConversationAssigned } = await import("@/modules/realtime/realtime.service");
  publishInboxEvent(tenantId, eventConversationAssigned(tenantId, { threadId, assignedToUserId: null, assignedToUser: null }));
  const { logAction } = await import("./auditService");
  await logAction(tenantId, threadId, callerUserId ?? "system", "unassign", {});
  return true;
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
