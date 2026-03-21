/**
 * Auditoria de ações na inbox.
 * Registra quem fez o quê para rastreabilidade e compliance.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma-whatsapp";

export type AuditAction =
  | "assign"
  | "unassign"
  | "status_change"
  | "tag_add"
  | "tag_remove"
  | "message_send"
  | "priority_change"
  | "ai_reply"
  | "automation_log";

export async function logAction(
  tenantId: string,
  threadId: string,
  userId: string,
  action: AuditAction,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.waInboxAuditLog.create({
    data: {
      tenantId,
      threadId,
      userId,
      action,
      metadata: (metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export type AuditLogEntry = {
  id: string;
  threadId: string;
  userId: string;
  action: AuditAction;
  metadata: unknown;
  createdAt: Date;
  user?: { id: string; name: string };
};

export async function getThreadAuditLog(
  tenantId: string,
  threadId: string,
  opts?: { limit?: number }
): Promise<AuditLogEntry[]> {
  const limit = Math.min(opts?.limit ?? 50, 200);
  const rows = await prisma.waInboxAuditLog.findMany({
    where: { tenantId, threadId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const userIds = [...new Set(rows.map((r) => r.userId))];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds }, tenantId },
          select: { id: true, name: true },
        })
      : [];
  const userMap = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => ({
    id: r.id,
    threadId: r.threadId,
    userId: r.userId,
    action: r.action as AuditAction,
    metadata: r.metadata,
    createdAt: r.createdAt,
    user: userMap.get(r.userId),
  }));
}
