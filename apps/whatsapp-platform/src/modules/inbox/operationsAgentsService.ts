/**
 * Agentes operacionais = utilizadores do tenant + whatsapp_agent_status + métricas de Inbox.
 */

import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";
import { isShowcaseDemoMode } from "@/lib/demoMode";
import { DEMO_AGENTS } from "@/demo/fixtures";
import { prisma } from "@/lib/prisma";

export type OperationalAgentQueue = { id: string; name: string };

export type OperationalAgentRow = {
  userId: string;
  name: string;
  email: string;
  /** Valor em `whatsapp_users.role` (operator | manager | platform_admin). */
  role: string;
  /** Estado em `whatsapp_agent_status`; fallback `offline` se não existir registo. */
  status: string;
  /** Threads não fechadas atribuídas ao utilizador. */
  activeThreadCount: number;
  /** Filas ativas com nome para contexto na UI. */
  queues: OperationalAgentQueue[];
  /**
   * Maior entre atualização de presença e última mensagem em conversa atribuída (ISO).
   * Ausente apenas se não houver sinal.
   */
  lastActivityAt: string | null;
};

function maxDate(a: Date | null | undefined, b: Date | null | undefined): Date | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a > b ? a : b;
}

export async function listOperationalAgents(tenantId: string): Promise<OperationalAgentRow[]> {
  if (isShowcaseDemoMode()) {
    void tenantId;
    return DEMO_AGENTS;
  }
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      agentStatus: { select: { status: true, updatedAt: true } },
      waInboxQueueMemberships: {
        where: { isActive: true },
        select: {
          queue: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const userIds = users.map((u) => u.id);

  const [assignedCounts, threadLastActivity] = await Promise.all([
    prisma.waInboxThread.groupBy({
      by: ["assignedToUserId"],
      where: {
        tenantId,
        status: { in: [WaInboxThreadStatus.OPEN, WaInboxThreadStatus.PENDING] },
        assignedToUserId: { not: null },
      },
      _count: { _all: true },
    }),
    userIds.length > 0
      ? prisma.waInboxThread.groupBy({
          by: ["assignedToUserId"],
          where: {
            tenantId,
            assignedToUserId: { in: userIds },
          },
          _max: { lastMessageAt: true },
        })
      : Promise.resolve([]),
  ]);

  const countByUser = new Map(
    assignedCounts.map((r) => [r.assignedToUserId!, r._count._all])
  );
  const lastMsgByUser = new Map(
    threadLastActivity.map((r) => [r.assignedToUserId!, r._max.lastMessageAt])
  );

  return users.map((u) => {
    const queues = u.waInboxQueueMemberships
      .map((m) => m.queue)
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, "pt"));
    const presenceAt = u.agentStatus?.updatedAt ?? null;
    const threadAt = lastMsgByUser.get(u.id) ?? null;
    const lastDt = maxDate(presenceAt, threadAt);

    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.agentStatus?.status ?? "offline",
      activeThreadCount: countByUser.get(u.id) ?? 0,
      queues,
      lastActivityAt: lastDt ? lastDt.toISOString() : null,
    };
  });
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
