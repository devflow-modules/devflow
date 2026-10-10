/**
 * Distribuição automática Client 1 — round-robin determinístico.
 *
 * Regras:
 * - Só actua se `automaticDistributionEnabled` no tenant.
 * - Nunca falha a ingestão inbound (erros são logados).
 * - Usa `assignThread` (CAS) — não escreve `assignedToUserId` directamente.
 * - Presença online/offline NÃO entra na elegibilidade v1 (estado manual/não autoritativo).
 */

import { prisma } from "@/lib/prisma";
import { ROLES_OPERATIONAL } from "@/modules/auth";
import { getOrCreateTenantOperationalConfig } from "@/modules/operations/tenantOperationalConfigService";
import { assignThread } from "./threadAssignmentService";
import { logWhatsappPilotEvent } from "@/lib/observability";

export type AutoRouteResult =
  | { attempted: false; reason: string }
  | { attempted: true; assigned: false; reason: string }
  | {
      attempted: true;
      assigned: true;
      assignedToUserId: string;
      strategy: "round_robin";
      queueId: string | null;
    };

function isOperationalRole(role: string): boolean {
  return (ROLES_OPERATIONAL as string[]).includes(role);
}

async function listEligibleUserIds(params: {
  tenantId: string;
  queueId: string | null;
}): Promise<string[]> {
  if (params.queueId) {
    const memberships = await prisma.waInboxQueueMembership.findMany({
      where: {
        tenantId: params.tenantId,
        queueId: params.queueId,
        isActive: true,
        user: {
          tenantId: params.tenantId,
          status: "active",
          role: { in: [...ROLES_OPERATIONAL] },
        },
        queue: { isActive: true, tenantId: params.tenantId },
      },
      select: { userId: true },
      orderBy: { userId: "asc" },
    });
    return memberships.map((m) => m.userId);
  }

  const users = await prisma.user.findMany({
    where: {
      tenantId: params.tenantId,
      status: "active",
      role: { in: [...ROLES_OPERATIONAL] },
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return users.map((u) => u.id);
}

/**
 * Avança o cursor e devolve o próximo userId elegível sob transacção.
 */
async function pickNextRoundRobinUser(params: {
  tenantId: string;
  queueId: string | null;
  eligibleUserIds: string[];
}): Promise<string | null> {
  const { tenantId, queueId, eligibleUserIds } = params;
  if (eligibleUserIds.length === 0) return null;

  return prisma.$transaction(async (tx) => {
    if (queueId) {
      const queue = await tx.waInboxQueue.findFirst({
        where: { id: queueId, tenantId },
        select: { id: true, routingRoundRobinCursor: true },
      });
      if (!queue) return null;
      const idx = queue.routingRoundRobinCursor % eligibleUserIds.length;
      const next = eligibleUserIds[idx]!;
      await tx.waInboxQueue.update({
        where: { id: queue.id },
        data: { routingRoundRobinCursor: queue.routingRoundRobinCursor + 1 },
      });
      return next;
    }

    const cfg = await tx.tenantOperationalConfig.findUnique({
      where: { tenantId },
      select: { routingRoundRobinCursor: true },
    });
    const cursor = cfg?.routingRoundRobinCursor ?? 0;
    const idx = cursor % eligibleUserIds.length;
    const next = eligibleUserIds[idx]!;
    await tx.tenantOperationalConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        routingRoundRobinCursor: 1,
        automaticDistributionEnabled: true,
      },
      update: { routingRoundRobinCursor: cursor + 1 },
    });
    return next;
  });
}

/**
 * Tenta atribuir uma thread unassigned via round-robin.
 * Idempotente em relação a ownership: se já tem dono / CLOSED, não sobrescreve.
 */
export async function tryAutomaticRoundRobinAssign(params: {
  tenantId: string;
  threadId: string;
}): Promise<AutoRouteResult> {
  const { tenantId, threadId } = params;

  const config = await getOrCreateTenantOperationalConfig(tenantId);
  if (!config.automaticDistributionEnabled) {
    return { attempted: false, reason: "distribution_disabled" };
  }

  const thread = await prisma.waInboxThread.findFirst({
    where: { id: threadId, tenantId },
    select: {
      id: true,
      status: true,
      assignedToUserId: true,
      queueId: true,
    },
  });

  if (!thread) {
    return { attempted: false, reason: "thread_not_found" };
  }
  if (thread.status === "CLOSED") {
    return { attempted: false, reason: "thread_closed" };
  }
  if (thread.assignedToUserId) {
    return { attempted: false, reason: "already_assigned" };
  }

  const eligible = await listEligibleUserIds({
    tenantId,
    queueId: thread.queueId,
  });

  if (eligible.length === 0) {
    logWhatsappPilotEvent("info", "inbox", "auto_route_no_eligible", {
      tenantId,
      threadId,
      queueId: thread.queueId ?? undefined,
    });
    return { attempted: true, assigned: false, reason: "no_eligible_users" };
  }

  const targetUserId = await pickNextRoundRobinUser({
    tenantId,
    queueId: thread.queueId,
    eligibleUserIds: eligible,
  });

  if (!targetUserId) {
    return { attempted: true, assigned: false, reason: "pick_failed" };
  }

  const target = await prisma.user.findFirst({
    where: { id: targetUserId, tenantId },
    select: { role: true },
  });
  if (!target || !isOperationalRole(target.role)) {
    return { attempted: true, assigned: false, reason: "pick_failed" };
  }

  const assignResult = await assignThread(
    tenantId,
    threadId,
    targetUserId,
    "system:automatic_routing",
    "system",
    {
      source: "automatic_routing",
      strategy: "round_robin",
      queueId: thread.queueId,
    }
  );

  if (!assignResult.ok) {
    logWhatsappPilotEvent("info", "inbox", "auto_route_assign_failed", {
      tenantId,
      threadId,
      reason: assignResult.reason,
    });
    return { attempted: true, assigned: false, reason: assignResult.reason };
  }

  if (!assignResult.changed) {
    return { attempted: true, assigned: false, reason: "no_change" };
  }

  return {
    attempted: true,
    assigned: true,
    assignedToUserId: targetUserId,
    strategy: "round_robin",
    queueId: thread.queueId,
  };
}

/** Side-effect seguro pós-inbound — nunca propaga erro. */
export async function maybeAutoRouteAfterInbound(params: {
  tenantId: string;
  threadId: string;
}): Promise<void> {
  try {
    await tryAutomaticRoundRobinAssign(params);
  } catch (e) {
    console.error(
      "[inbox.auto_route] falha não bloqueante",
      e instanceof Error ? e.message : e
    );
  }
}
