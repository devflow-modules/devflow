/**
 * Filas operacionais (WaInboxQueue) — fonte canónica alinhada à Inbox.
 */

import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";
import { isShowcaseDemoMode } from "@/lib/demoMode";
import { DEMO_QUEUES } from "@/demo/fixtures";
import { prisma } from "@/lib/prisma";
import { SLA_TIER_HIGH_MAX_MS } from "./waInboxSla";

function slugCandidate(raw: string): string {
  const s = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return s || "fila";
}

export async function ensureUniqueQueueSlug(
  tenantId: string,
  base: string,
  excludeQueueId?: string
): Promise<string> {
  const slug = slugCandidate(base);
  let n = 0;
  for (;;) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const found = await prisma.waInboxQueue.findFirst({
      where: {
        tenantId,
        slug: candidate,
        ...(excludeQueueId ? { id: { not: excludeQueueId } } : {}),
      },
      select: { id: true },
    });
    if (!found) return candidate;
    n += 1;
  }
}

export async function createOperationalQueue(
  tenantId: string,
  input: {
    name: string;
    slug?: string;
    description?: string | null;
    color?: string | null;
    slaTargetMinutes?: number | null;
    isActive?: boolean;
  }
) {
  const slug = await ensureUniqueQueueSlug(tenantId, input.slug?.trim() || input.name);
  return prisma.waInboxQueue.create({
    data: {
      tenantId,
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      color: input.color?.trim() || null,
      slaTargetMinutes: input.slaTargetMinutes ?? null,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateOperationalQueue(
  tenantId: string,
  queueId: string,
  input: {
    name?: string;
    slug?: string;
    description?: string | null;
    color?: string | null;
    slaTargetMinutes?: number | null;
    isActive?: boolean;
  }
) {
  const existing = await prisma.waInboxQueue.findFirst({
    where: { id: queueId, tenantId },
  });
  if (!existing) return null;

  let slug = existing.slug;
  if (input.slug !== undefined) {
    slug = await ensureUniqueQueueSlug(tenantId, input.slug, queueId);
  }

  return prisma.waInboxQueue.update({
    where: { id: queueId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      slug,
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.color !== undefined ? { color: input.color?.trim() || null } : {}),
      ...(input.slaTargetMinutes !== undefined ? { slaTargetMinutes: input.slaTargetMinutes } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function deleteOperationalQueue(tenantId: string, queueId: string): Promise<boolean> {
  const existing = await prisma.waInboxQueue.findFirst({
    where: { id: queueId, tenantId },
  });
  if (!existing) return false;

  await prisma.$transaction([
    prisma.waInboxThread.updateMany({
      where: { tenantId, queueId },
      data: { queueId: null },
    }),
    prisma.waInboxQueueMembership.deleteMany({ where: { queueId } }),
    prisma.waInboxQueue.delete({ where: { id: queueId } }),
  ]);
  return true;
}

export async function getOperationalQueue(tenantId: string, queueId: string) {
  return prisma.waInboxQueue.findFirst({
    where: { id: queueId, tenantId },
    include: {
      memberships: {
        where: { isActive: true },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
}

/** Threads abertas/pendentes na fila (backlog operacional). */
async function countBacklogInQueue(tenantId: string, queueId: string): Promise<number> {
  return prisma.waInboxThread.count({
    where: {
      tenantId,
      queueId,
      status: { in: [WaInboxThreadStatus.OPEN, WaInboxThreadStatus.PENDING] },
    },
  });
}

async function countUnassignedInQueue(tenantId: string, queueId: string): Promise<number> {
  return prisma.waInboxThread.count({
    where: {
      tenantId,
      queueId,
      assignedToUserId: null,
      status: { in: [WaInboxThreadStatus.OPEN, WaInboxThreadStatus.PENDING] },
    },
  });
}

/** Inbound pendente com atraso SLA >= high (mesma regra do dashboard gerencial). */
async function countCriticalSlaInQueue(tenantId: string, queueId: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ c: bigint }>>`
    WITH base AS (
      SELECT
        t.id,
        t.status,
        (SELECT COUNT(*)::int FROM wa_inbox_messages mi
         WHERE mi.thread_id = t.id AND mi.tenant_id = t.tenant_id
           AND mi.direction = 'INBOUND'
           AND mi.ts > COALESCE(
             (SELECT MAX(mo.ts) FROM wa_inbox_messages mo
              WHERE mo.thread_id = t.id AND mo.tenant_id = t.tenant_id AND mo.direction = 'OUTBOUND'),
             'epoch'::timestamp
           )
        ) AS unanswered_inbound_count,
        (SELECT MAX(mi.ts) FROM wa_inbox_messages mi
         WHERE mi.thread_id = t.id AND mi.tenant_id = t.tenant_id
           AND mi.direction = 'INBOUND'
           AND mi.ts > COALESCE(
             (SELECT MAX(mo.ts) FROM wa_inbox_messages mo
              WHERE mo.thread_id = t.id AND mo.tenant_id = t.tenant_id AND mo.direction = 'OUTBOUND'),
             'epoch'::timestamp
           )
        ) AS last_unanswered_inbound_at
      FROM wa_inbox_threads t
      WHERE t.tenant_id = ${tenantId} AND t.queue_id = ${queueId}
    ),
    calc AS (
      SELECT *,
        CASE
          WHEN unanswered_inbound_count > 0
            AND base.status::text <> 'CLOSED'
            AND last_unanswered_inbound_at IS NOT NULL
          THEN (EXTRACT(EPOCH FROM (NOW() - last_unanswered_inbound_at)) * 1000)::bigint
          ELSE NULL
        END AS response_delay_ms
      FROM base
    )
    SELECT COUNT(*)::bigint AS c FROM calc
    WHERE unanswered_inbound_count > 0
      AND status::text <> 'CLOSED'
      AND response_delay_ms IS NOT NULL
      AND response_delay_ms >= ${SLA_TIER_HIGH_MAX_MS}
  `;
  return Number(rows[0]?.c ?? 0);
}

export type OperationalQueueWithMetrics = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  slaTargetMinutes: number | null;
  isActive: boolean;
  backlogCount: number;
  unassignedCount: number;
  criticalSlaCount: number;
  members: { userId: string; name: string; email: string }[];
};

export async function listOperationalQueuesWithMetrics(
  tenantId: string
): Promise<OperationalQueueWithMetrics[]> {
  if (isShowcaseDemoMode()) {
    void tenantId;
    return DEMO_QUEUES;
  }
  const queues = await prisma.waInboxQueue.findMany({
    where: { tenantId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      memberships: {
        where: { isActive: true },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  const out: OperationalQueueWithMetrics[] = [];
  for (const q of queues) {
    const [backlogCount, unassignedCount, criticalSlaCount] = await Promise.all([
      countBacklogInQueue(tenantId, q.id),
      countUnassignedInQueue(tenantId, q.id),
      countCriticalSlaInQueue(tenantId, q.id),
    ]);
    out.push({
      id: q.id,
      name: q.name,
      slug: q.slug,
      description: q.description,
      color: q.color,
      slaTargetMinutes: q.slaTargetMinutes,
      isActive: q.isActive,
      backlogCount,
      unassignedCount,
      criticalSlaCount,
      members: q.memberships.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
      })),
    });
  }
  return out;
}

export async function addQueueMember(
  tenantId: string,
  queueId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "wrong_tenant" }> {
  const queue = await prisma.waInboxQueue.findFirst({
    where: { id: queueId, tenantId },
    select: { id: true },
  });
  if (!queue) return { ok: false, reason: "not_found" };

  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: { id: true },
  });
  if (!user) return { ok: false, reason: "wrong_tenant" };

  await prisma.waInboxQueueMembership.upsert({
    where: { queueId_userId: { queueId, userId } },
    create: { tenantId, queueId, userId, isActive: true },
    update: { isActive: true },
  });
  return { ok: true };
}

export async function removeQueueMember(
  tenantId: string,
  queueId: string,
  userId: string
): Promise<boolean> {
  const queue = await prisma.waInboxQueue.findFirst({
    where: { id: queueId, tenantId },
    select: { id: true },
  });
  if (!queue) return false;

  const res = await prisma.waInboxQueueMembership.deleteMany({
    where: { queueId, userId, tenantId },
  });
  return res.count > 0;
}

export async function setThreadQueue(
  tenantId: string,
  threadId: string,
  queueId: string | null
): Promise<boolean> {
  if (queueId) {
    const q = await prisma.waInboxQueue.findFirst({
      where: { id: queueId, tenantId },
      select: { id: true },
    });
    if (!q) return false;
  }

  const res = await prisma.waInboxThread.updateMany({
    where: { id: threadId, tenantId },
    data: { queueId },
  });
  return res.count > 0;
}
