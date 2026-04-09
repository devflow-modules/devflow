/**
 * Agentes operacionais = utilizadores do tenant + whatsapp_agent_status + métricas de Inbox.
 */

import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";

export type OperationalAgentRow = {
  userId: string;
  name: string;
  email: string;
  /** Estado em `whatsapp_agent_status`; fallback `offline` se não existir registo. */
  status: string;
  /** Threads não fechadas atribuídas ao utilizador. */
  activeThreadCount: number;
  queueIds: string[];
};

export async function listOperationalAgents(tenantId: string): Promise<OperationalAgentRow[]> {
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      agentStatus: { select: { status: true } },
      waInboxQueueMemberships: {
        where: { isActive: true },
        select: { queueId: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const assignedCounts = await prisma.waInboxThread.groupBy({
    by: ["assignedToUserId"],
    where: {
      tenantId,
      status: { in: [WaInboxThreadStatus.OPEN, WaInboxThreadStatus.PENDING] },
      assignedToUserId: { not: null },
    },
    _count: { _all: true },
  });
  const countByUser = new Map(
    assignedCounts.map((r) => [r.assignedToUserId!, r._count._all])
  );

  return users.map((u) => ({
    userId: u.id,
    name: u.name,
    email: u.email,
    status: u.agentStatus?.status ?? "offline",
    activeThreadCount: countByUser.get(u.id) ?? 0,
    queueIds: u.waInboxQueueMemberships.map((m) => m.queueId),
  }));
}

export async function upsertAgentOperationalStatus(
  tenantId: string,
  userId: string,
  status: string
): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: { id: true },
  });
  if (!user) return false;

  await prisma.agentStatus.upsert({
    where: { userId },
    create: { tenantId, userId, status },
    update: { status },
  });
  return true;
}
