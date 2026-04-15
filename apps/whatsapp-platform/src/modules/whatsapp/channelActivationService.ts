import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";
import { prisma } from "@/lib/prisma";
import {
  getChannelPlaybook,
  resolveWebhookCallbackUrl,
  toActivationPlaybookDto,
  type ActivationPlaybookDto,
} from "@/modules/whatsapp/activationPlaybookService";
import {
  canAutoHeal,
  computeAutoHealStatus,
  isAutoHealEnabled,
  scheduleAutoHealDeferred,
  type AutoHealStatus,
} from "@/modules/whatsapp/autoHealService";
import {
  evaluateChannelAlerts,
  getLastChannelEvent,
  getLastEventsForChannelIds,
  type ChannelAlert,
} from "@/modules/whatsapp/channelEventService";

export type SlaStatus = "ok" | "delay" | "critical";

/** Filtro da fila pendente (query `filter`). */
export type PendingQueueFilter = "all" | "ok" | "delay" | "critical" | "possibly_stuck";

export type SlaBuckets = {
  ok: number;
  delay: number;
  critical: number;
};

export type PendingChannelRow = {
  id: string;
  tenantId: string;
  phoneNumber: string;
  phoneNumberId: string;
  tenantName: string;
  status: typeof WhatsappPhoneNumberStatus.PENDING_ACTIVATION;
  createdAt: string;
  updatedAt: string;
  /** Sempre null enquanto PENDING_ACTIVATION. */
  activatedAt: null;
  minutesInQueue: number;
  slaStatus: SlaStatus;
  possiblyStuck: boolean;
  priorityScore: number;
  /** Último evento da timeline (opcional; enriquecido na API). */
  lastEvent?: { type: string; message: string; createdAt?: string } | null;
  /** Alertas internos para operação. */
  alerts?: ChannelAlert[];
  /** Há playbook de resolução (último evento ERROR classificável). */
  playbookAvailable?: boolean;
  /** Candidato a auto-healing futuro (servidor). */
  autoHealCandidate?: boolean;
  autoHealAttempts: number;
  lastAutoHealAt: string | null;
  autoHealStatus: AutoHealStatus;
};

export type ActivationMetrics = {
  total: number;
  active: number;
  pending: number;
  activationRate: number;
  /** Média em minutos entre `createdAt` e `activatedAt` (só canais com `activatedAt`). */
  avgActivationTimeMinutes: number | null;
  slaBuckets: SlaBuckets;
};

/** Minutos completos entre duas datas (nunca negativo). */
export function differenceInMinutesSafe(later: Date, earlier: Date): number {
  const ms = later.getTime() - earlier.getTime();
  return Math.max(0, Math.floor(ms / 60_000));
}

/**
 * SLA para tempo em fila (desde createdAt até agora).
 * &lt; 5 min → ok · 5–30 min → delay · &gt; 30 min → critical
 */
export function computeSlaStatus(
  createdAt: Date,
  now: Date = new Date()
): { minutesInQueue: number; slaStatus: SlaStatus } {
  const minutesInQueue = differenceInMinutesSafe(now, createdAt);
  let slaStatus: SlaStatus = "ok";
  if (minutesInQueue > 30) slaStatus = "critical";
  else if (minutesInQueue >= 5) slaStatus = "delay";
  return { minutesInQueue, slaStatus };
}

const STUCK_MINUTES = 15;

/**
 * Pontuação determinística: crítico e travados sobem; minutos na fila na base.
 * critical +100 · possiblyStuck +40 · delay +20 · + minutesInQueue
 */
export function computePriorityScore(input: {
  minutesInQueue: number;
  slaStatus: SlaStatus;
  possiblyStuck: boolean;
}): number {
  let score = input.minutesInQueue;
  if (input.slaStatus === "critical") score += 100;
  if (input.possiblyStuck) score += 40;
  if (input.slaStatus === "delay") score += 20;
  return score;
}

function isPossiblyStuck(updatedAt: Date, now: Date): boolean {
  return differenceInMinutesSafe(now, updatedAt) > STUCK_MINUTES;
}

function mapPendingRow(
  r: {
    id: string;
    tenantId: string;
    phoneNumberId: string;
    displayPhoneNumber: string | null;
    createdAt: Date;
    updatedAt: Date;
    autoHealAttempts: number;
    lastAutoHealAt: Date | null;
    tenant: { name: string | null };
  },
  now: Date
): PendingChannelRow {
  const { minutesInQueue, slaStatus } = computeSlaStatus(r.createdAt, now);
  const possiblyStuck = isPossiblyStuck(r.updatedAt, now);
  const priorityScore = computePriorityScore({ minutesInQueue, slaStatus, possiblyStuck });
  return {
    id: r.id,
    tenantId: r.tenantId,
    phoneNumber: r.displayPhoneNumber?.trim() || "—",
    phoneNumberId: r.phoneNumberId,
    tenantName: r.tenant.name?.trim() || r.tenantId,
    status: WhatsappPhoneNumberStatus.PENDING_ACTIVATION,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    activatedAt: null,
    minutesInQueue,
    slaStatus,
    possiblyStuck,
    priorityScore,
    autoHealAttempts: r.autoHealAttempts,
    lastAutoHealAt: r.lastAutoHealAt?.toISOString() ?? null,
    autoHealStatus: "DISABLED",
  };
}

export function matchesPendingFilter(row: PendingChannelRow, filter: PendingQueueFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "ok":
      return row.slaStatus === "ok";
    case "delay":
      return row.slaStatus === "delay";
    case "critical":
      return row.slaStatus === "critical";
    case "possibly_stuck":
      return row.possiblyStuck;
    default:
      return true;
  }
}

/** Conta pendentes por bucket SLA (mesma lógica que `computeSlaStatus`). */
export async function getPendingSlaBuckets(): Promise<SlaBuckets> {
  const rows = await prisma.whatsappPhoneNumber.findMany({
    where: { status: WhatsappPhoneNumberStatus.PENDING_ACTIVATION },
    select: { createdAt: true },
  });
  const now = new Date();
  const buckets: SlaBuckets = { ok: 0, delay: 0, critical: 0 };
  for (const r of rows) {
    const { slaStatus } = computeSlaStatus(r.createdAt, now);
    buckets[slaStatus] += 1;
  }
  return buckets;
}

export async function getPendingChannels(options: {
  page: number;
  limit: number;
  filter: PendingQueueFilter;
}): Promise<{ items: PendingChannelRow[]; total: number }> {
  const { page, limit, filter } = options;
  const skip = (page - 1) * limit;
  const now = new Date();

  const rawRows = await prisma.whatsappPhoneNumber.findMany({
    where: { status: WhatsappPhoneNumberStatus.PENDING_ACTIVATION },
    include: { tenant: { select: { name: true } } },
  });

  const mapped = rawRows.map((r) => mapPendingRow(r, now));
  const filtered =
    filter === "all" ? mapped : mapped.filter((row) => matchesPendingFilter(row, filter));

  filtered.sort((a, b) => {
    const d = b.priorityScore - a.priorityScore;
    if (d !== 0) return d;
    return a.createdAt.localeCompare(b.createdAt);
  });

  const total = filtered.length;
  const slice = filtered.slice(skip, skip + limit);
  const ids = slice.map((r) => r.id);
  const lastMap = await getLastEventsForChannelIds(ids);
  const rawById = new Map(rawRows.map((r) => [r.id, r]));
  const items = slice.map((row) => {
    const lastEvent = lastMap.get(row.id) ?? null;
    const alerts = evaluateChannelAlerts({
      slaStatus: row.slaStatus,
      possiblyStuck: row.possiblyStuck,
      minutesInQueue: row.minutesInQueue,
      lastEvent,
    });
    const playbookModel = getChannelPlaybook({
      status: row.status,
      lastEvent,
    });
    const playbookAvailable = playbookModel !== null;
    const raw = rawById.get(row.id);
    const autoHealEval = {
      status: row.status,
      lastEvent,
      autoHealAttempts: row.autoHealAttempts,
      lastAutoHealAt: row.lastAutoHealAt ? new Date(row.lastAutoHealAt) : null,
      hasStoredAccessToken: Boolean(raw?.accessToken?.trim()),
    };
    const autoHealStatus = computeAutoHealStatus(autoHealEval);
    const autoHealCandidate = canAutoHeal(autoHealEval);
    return { ...row, lastEvent, alerts, playbookAvailable, autoHealCandidate, autoHealStatus };
  });

  for (const it of items) {
    if (it.autoHealCandidate) {
      scheduleAutoHealDeferred(it.id, { autoHealAttempts: it.autoHealAttempts });
    }
  }

  return { items, total };
}

export type AdminChannelDetail = {
  id: string;
  tenantId: string;
  phoneNumber: string;
  phoneNumberId: string;
  tenantName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
  minutesInQueue: number;
  slaStatus: SlaStatus;
  possiblyStuck: boolean;
  lastEvent: { type: string; message: string; createdAt?: string } | null;
  playbook: ActivationPlaybookDto | null;
  autoHealCandidate: boolean;
  autoHealAttempts: number;
  autoHealStatus: AutoHealStatus;
  /** Flag global (env); útil para o drawer explicar «desligado». */
  autoHealFeatureEnabled: boolean;
};

/**
 * Detalhe de canal para admin (SLA + último evento).
 */
export async function getChannelAdminDetail(channelId: string): Promise<AdminChannelDetail | null> {
  const row = await prisma.whatsappPhoneNumber.findUnique({
    where: { id: channelId },
    include: { tenant: { select: { name: true } } },
  });
  if (!row) return null;

  const now = new Date();
  let minutesInQueue = 0;
  let slaStatus: SlaStatus = "ok";
  let possiblyStuck = false;

  if (row.status === WhatsappPhoneNumberStatus.PENDING_ACTIVATION) {
    const mq = computeSlaStatus(row.createdAt, now);
    minutesInQueue = mq.minutesInQueue;
    slaStatus = mq.slaStatus;
    possiblyStuck = isPossiblyStuck(row.updatedAt, now);
  }

  const lastEv = await getLastChannelEvent(channelId);

  const lastEventPayload = lastEv
    ? { type: lastEv.type, message: lastEv.message, createdAt: lastEv.createdAt }
    : null;

  const playbookModel = getChannelPlaybook({
    status: row.status,
    lastEvent: lastEventPayload,
  });
  const playbook = playbookModel
    ? toActivationPlaybookDto(playbookModel, { webhookCallbackUrl: resolveWebhookCallbackUrl() })
    : null;

  const autoHealEval = {
    status: row.status,
    lastEvent: lastEventPayload,
    autoHealAttempts: row.autoHealAttempts,
    lastAutoHealAt: row.lastAutoHealAt,
    hasStoredAccessToken: Boolean(row.accessToken?.trim()),
  };
  const autoHealStatus = computeAutoHealStatus(autoHealEval);
  const autoHealCandidate = canAutoHeal(autoHealEval);

  return {
    id: row.id,
    tenantId: row.tenantId,
    phoneNumber: row.displayPhoneNumber?.trim() || "—",
    phoneNumberId: row.phoneNumberId,
    tenantName: row.tenant.name?.trim() || row.tenantId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    activatedAt: row.activatedAt?.toISOString() ?? null,
    minutesInQueue,
    slaStatus,
    possiblyStuck,
    lastEvent: lastEventPayload,
    playbook,
    autoHealCandidate,
    autoHealAttempts: row.autoHealAttempts,
    autoHealStatus,
    autoHealFeatureEnabled: isAutoHealEnabled(),
  };
}

export async function getActivationMetrics(): Promise<ActivationMetrics> {
  const [total, active, pending, activatedRows, slaBuckets] = await Promise.all([
    prisma.whatsappPhoneNumber.count(),
    prisma.whatsappPhoneNumber.count({ where: { status: WhatsappPhoneNumberStatus.ACTIVE } }),
    prisma.whatsappPhoneNumber.count({ where: { status: WhatsappPhoneNumberStatus.PENDING_ACTIVATION } }),
    prisma.whatsappPhoneNumber.findMany({
      where: { activatedAt: { not: null } },
      select: { createdAt: true, activatedAt: true },
    }),
    getPendingSlaBuckets(),
  ]);

  const activationRate = total === 0 ? 0 : Math.round((active / total) * 1000) / 10;

  let avgActivationTimeMinutes: number | null = null;
  if (activatedRows.length > 0) {
    const sum = activatedRows.reduce(
      (acc, r) => acc + differenceInMinutesSafe(r.activatedAt!, r.createdAt),
      0
    );
    avgActivationTimeMinutes = Math.round((sum / activatedRows.length) * 10) / 10;
  }

  return {
    total,
    active,
    pending,
    activationRate,
    avgActivationTimeMinutes,
    slaBuckets,
  };
}
