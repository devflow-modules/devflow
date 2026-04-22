import { prisma } from "@/lib/prisma";

export const CHANNEL_EVENT_TYPES = [
  "CHANNEL_CREATED",
  "TOKEN_ATTACHED",
  "WEBHOOK_VERIFIED",
  "ACTIVATED",
  "ERROR",
  "AUTO_HEAL_ATTEMPT",
  "AUTO_HEAL_SUCCESS",
  "AUTO_HEAL_FAILED",
  "AUTO_HEAL_SKIPPED",
  "VERIFICATION_CHECKLIST_UPDATED",
  "VERIFICATION_STATUS_CHANGED",
  "VERIFICATION_COMPUTED",
] as const;

export type ChannelEventType = (typeof CHANNEL_EVENT_TYPES)[number];

export type ChannelActivationEvent = {
  id: string;
  channelId: string;
  type: ChannelEventType;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type ChannelAlert = {
  level: "info" | "warning" | "critical";
  message: string;
};

export type LogChannelEventInput = {
  channelId: string;
  type: ChannelEventType;
  message: string;
  metadata?: Record<string, unknown>;
};

/**
 * Persiste um evento de canal (timeline admin). Falhas são engolidas para não quebrar fluxo principal.
 */
export async function logChannelEvent(input: LogChannelEventInput): Promise<void> {
  try {
    await prisma.whatsappChannelEvent.create({
      data: {
        channelId: input.channelId.trim(),
        type: input.type,
        message: input.message.trim().slice(0, 2000),
        metadata: input.metadata === undefined ? undefined : (input.metadata as object),
      },
    });
  } catch (e) {
    console.error("[channelEventService] logChannelEvent failed", e);
  }
}

/** Primeiro evento WEBHOOK_VERIFIED por canal (webhook POST com tenant resolvido). */
export async function logWebhookVerifiedOnce(channelId: string): Promise<void> {
  try {
    const n = await prisma.whatsappChannelEvent.count({
      where: { channelId, type: "WEBHOOK_VERIFIED" },
    });
    if (n > 0) return;
    await logChannelEvent({
      channelId,
      type: "WEBHOOK_VERIFIED",
      message: "Webhook Cloud API: evento recebido e tenant resolvido.",
      metadata: { source: "webhook_post" },
    });
  } catch (e) {
    console.error("[channelEventService] logWebhookVerifiedOnce", e);
  }
}

export async function getChannelTimeline(channelId: string): Promise<ChannelActivationEvent[]> {
  const rows = await prisma.whatsappChannelEvent.findMany({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    channelId: r.channelId,
    type: r.type as ChannelEventType,
    message: r.message,
    metadata: r.metadata && typeof r.metadata === "object" ? (r.metadata as Record<string, unknown>) : null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getLastChannelEvent(
  channelId: string
): Promise<{ type: ChannelEventType; message: string; createdAt: string } | null> {
  const row = await prisma.whatsappChannelEvent.findFirst({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    select: { type: true, message: true, createdAt: true },
  });
  if (!row) return null;
  return {
    type: row.type as ChannelEventType,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getLastEventsForChannelIds(
  channelIds: string[]
): Promise<Map<string, { type: ChannelEventType; message: string; createdAt: string }>> {
  const out = new Map<string, { type: ChannelEventType; message: string; createdAt: string }>();
  if (channelIds.length === 0) return out;

  const rows = await prisma.whatsappChannelEvent.findMany({
    where: { channelId: { in: channelIds } },
    orderBy: { createdAt: "desc" },
    select: { channelId: true, type: true, message: true, createdAt: true },
  });
  for (const r of rows) {
    if (!out.has(r.channelId)) {
      out.set(r.channelId, {
        type: r.type as ChannelEventType,
        message: r.message,
        createdAt: r.createdAt.toISOString(),
      });
    }
  }
  return out;
}

/**
 * Alertas internos para operação (base futura para email/webhook).
 */
export function evaluateChannelAlerts(input: {
  slaStatus: "ok" | "delay" | "critical";
  possiblyStuck: boolean;
  minutesInQueue: number;
  lastEvent: { type: string; message: string } | null;
}): ChannelAlert[] {
  const alerts: ChannelAlert[] = [];
  if (input.slaStatus === "critical") {
    alerts.push({
      level: "critical",
      message: `Canal crítico há ${input.minutesInQueue} minutos na fila — ação imediata necessária.`,
    });
  }
  if (input.possiblyStuck) {
    alerts.push({
      level: "warning",
      message: "Possível travamento: sem atualização há mais de 15 minutos.",
    });
  }
  if (input.lastEvent?.type === "ERROR") {
    alerts.push({
      level: "warning",
      message: `Último erro: ${input.lastEvent.message.slice(0, 200)}`,
    });
  }
  return alerts;
}
