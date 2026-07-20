/**
 * Atribuição de conversas (threads) a utilizadores do tenant.
 *
 * Política: claim só se unassigned (CAS); transferência/liberação autorizada;
 * CLOSED bloqueia mudanças de ownership; no-ops sem side effects.
 * Ver `docs/architecture/CONVERSATION_OWNERSHIP_AND_HANDOFF.md`.
 */

import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";
import type { UserRole } from "@/modules/auth";
import { ROLES_OPERATIONAL } from "@/modules/auth";
import { prisma } from "@/lib/prisma";

const CAS_ATTEMPTS = 2;

export type AssignmentActorRole = UserRole | "system";

export type AssignmentResult =
  | { ok: true; changed: boolean }
  | {
      ok: false;
      reason: "not_found" | "target_not_found" | "forbidden" | "conflict" | "closed";
    };

function canManageOthersAssignment(role: AssignmentActorRole): boolean {
  return role === "manager" || role === "platform_admin" || role === "system";
}

function isOperationalRole(role: string): role is UserRole {
  return (ROLES_OPERATIONAL as string[]).includes(role);
}

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

async function publishAndAuditAssign(params: {
  tenantId: string;
  threadId: string;
  previousAssigneeId: string | null;
  assignedToUserId: string;
  assignedToUser: { id: string; name: string; email: string };
  callerUserId: string;
}): Promise<void> {
  const { tenantId, threadId, previousAssigneeId, assignedToUserId, assignedToUser, callerUserId } =
    params;
  if (previousAssigneeId && previousAssigneeId !== assignedToUserId) {
    await releaseAgentCurrentThreadIfMatches(tenantId, previousAssigneeId, threadId);
  }
  await syncAgentBusyOnThread(tenantId, assignedToUserId, threadId);

  const { publishInboxEvent, eventConversationAssigned } = await import(
    "@/modules/realtime/realtime.service"
  );
  publishInboxEvent(
    tenantId,
    eventConversationAssigned(tenantId, {
      threadId,
      assignedToUserId,
      assignedToUser,
      previousAssigneeId,
    })
  );
  const { logAction } = await import("./auditService");
  await logAction(tenantId, threadId, callerUserId, "assign", {
    previousAssigneeId,
    assignedToUserId,
  });
}

async function publishAndAuditUnassign(params: {
  tenantId: string;
  threadId: string;
  previousAssigneeId: string;
  callerUserId: string;
}): Promise<void> {
  const { tenantId, threadId, previousAssigneeId, callerUserId } = params;
  await releaseAgentCurrentThreadIfMatches(tenantId, previousAssigneeId, threadId);

  const { publishInboxEvent, eventConversationAssigned } = await import(
    "@/modules/realtime/realtime.service"
  );
  publishInboxEvent(
    tenantId,
    eventConversationAssigned(tenantId, {
      threadId,
      assignedToUserId: null,
      assignedToUser: null,
      previousAssigneeId,
    })
  );
  const { logAction } = await import("./auditService");
  await logAction(tenantId, threadId, callerUserId, "unassign", {
    previousAssigneeId,
    assignedToUserId: null,
  });
}

/**
 * Claim (unassigned → target) ou transferência (owner → target).
 * `callerRole: "system"` para automações/handoff (não inventar round-robin).
 */
export async function assignThread(
  tenantId: string,
  threadId: string,
  targetUserId: string,
  callerUserId: string,
  callerRole: AssignmentActorRole
): Promise<AssignmentResult> {
  const target = await prisma.user.findFirst({
    where: { id: targetUserId, tenantId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!target || !isOperationalRole(target.role)) {
    return { ok: false, reason: "target_not_found" };
  }

  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
    const thread = await prisma.waInboxThread.findFirst({
      where: { id: threadId, tenantId },
      select: { assignedToUserId: true, status: true },
    });
    if (!thread) return { ok: false, reason: "not_found" };
    if (thread.status === WaInboxThreadStatus.CLOSED) {
      return { ok: false, reason: "closed" };
    }

    const previousAssigneeId = thread.assignedToUserId;
    if (previousAssigneeId === targetUserId) {
      return { ok: true, changed: false };
    }

    if (previousAssigneeId !== null) {
      const isOwner = callerUserId === previousAssigneeId;
      const canTransfer = isOwner || canManageOthersAssignment(callerRole);
      if (!canTransfer) {
        // Claim sobre conversa alheia → conflito; transferir alheia → proibido
        return {
          ok: false,
          reason: targetUserId === callerUserId ? "conflict" : "forbidden",
        };
      }
    }

    const updated = await prisma.waInboxThread.updateMany({
      where: {
        id: threadId,
        tenantId,
        assignedToUserId: previousAssigneeId,
        status: { not: WaInboxThreadStatus.CLOSED },
      },
      data: { assignedToUserId: targetUserId },
    });

    if (updated.count > 0) {
      await publishAndAuditAssign({
        tenantId,
        threadId,
        previousAssigneeId,
        assignedToUserId: targetUserId,
        assignedToUser: { id: target.id, name: target.name, email: target.email },
        callerUserId,
      });
      return { ok: true, changed: true };
    }
  }

  const final = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: { assignedToUserId: true, status: true },
  });
  if (!final) return { ok: false, reason: "not_found" };
  if (final.status === WaInboxThreadStatus.CLOSED) return { ok: false, reason: "closed" };
  if (final.assignedToUserId === targetUserId) return { ok: true, changed: false };
  return { ok: false, reason: "conflict" };
}

export async function unassignThread(
  tenantId: string,
  threadId: string,
  callerUserId: string,
  callerRole: AssignmentActorRole
): Promise<AssignmentResult> {
  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
    const thread = await prisma.waInboxThread.findFirst({
      where: { id: threadId, tenantId },
      select: { assignedToUserId: true, status: true },
    });
    if (!thread) return { ok: false, reason: "not_found" };
    if (thread.status === WaInboxThreadStatus.CLOSED) {
      return { ok: false, reason: "closed" };
    }

    const previousAssigneeId = thread.assignedToUserId;
    if (previousAssigneeId === null) {
      return { ok: true, changed: false };
    }

    const isOwner = callerUserId === previousAssigneeId;
    if (!isOwner && !canManageOthersAssignment(callerRole)) {
      return { ok: false, reason: "forbidden" };
    }

    const updated = await prisma.waInboxThread.updateMany({
      where: {
        id: threadId,
        tenantId,
        assignedToUserId: previousAssigneeId,
        status: { not: WaInboxThreadStatus.CLOSED },
      },
      data: { assignedToUserId: null },
    });

    if (updated.count > 0) {
      await publishAndAuditUnassign({
        tenantId,
        threadId,
        previousAssigneeId,
        callerUserId,
      });
      return { ok: true, changed: true };
    }
  }

  const final = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: { assignedToUserId: true, status: true },
  });
  if (!final) return { ok: false, reason: "not_found" };
  if (final.status === WaInboxThreadStatus.CLOSED) return { ok: false, reason: "closed" };
  if (final.assignedToUserId === null) return { ok: true, changed: false };
  return { ok: false, reason: "conflict" };
}

export async function getAssignedThreads(tenantId: string, userId: string) {
  return prisma.waInboxThread.findMany({
    where: { tenantId, assignedToUserId: userId },
    orderBy: { lastMessageAt: "desc" },
  });
}

/** Utilizadores operacionais do tenant (candidatos a responsável). */
export async function listUsersByTenant(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId, role: { in: [...ROLES_OPERATIONAL] } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
}
