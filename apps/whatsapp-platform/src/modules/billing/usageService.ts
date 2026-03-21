import { prisma } from "@/lib/prisma";
import { UsageEventType } from "@/generated/prisma-whatsapp";
import type { Prisma } from "@/generated/prisma-whatsapp";
import { getPlanLimits, isBillingEnforceLimits, normalizePlanKey } from "./planConfig";
import { reportMessageUsage } from "./application/reportMessageUsage";
import { reportAiUsage } from "./application/reportAiUsage";
import { isMeterEventsConfigured } from "./infrastructure/stripeMeterClient";
import { logUsageEvent, logSystemError } from "./billingObserverService";

export function periodYYYYMM(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Registra uso (mensagem enviada ou resposta IA). Não bloqueia; falhas só em log.
 * Com metered configurado, reporta ao Stripe de forma assíncrona (idempotente por event id).
 */
export function trackUsage(
  tenantId: string,
  type: UsageEventType,
  options?: { quantity?: number; metadata?: Record<string, unknown> }
): void {
  if (!tenantId || tenantId === "env") return;
  const quantity = Math.max(1, options?.quantity ?? 1);
  const metadata = options?.metadata as Prisma.InputJsonValue | undefined;
  const period = periodYYYYMM();
  const useMeterEvents = isMeterEventsConfigured();

  void (async () => {
    try {
      const eventId = await prisma.$transaction(async (tx) => {
        const ev = await tx.usageEvent.create({
          data: { tenantId, type, quantity, metadata },
        });
        if (type === UsageEventType.MESSAGE_SENT) {
          await tx.usageAggregate.upsert({
            where: { tenantId_period: { tenantId, period } },
            create: {
              tenantId,
              period,
              messagesCount: quantity,
              aiCount: 0,
            },
            update: { messagesCount: { increment: quantity } },
          });
        } else {
          await tx.usageAggregate.upsert({
            where: { tenantId_period: { tenantId, period } },
            create: {
              tenantId,
              period,
              messagesCount: 0,
              aiCount: quantity,
            },
            update: { aiCount: { increment: quantity } },
          });
        }
        return ev.id;
      });
      logUsageEvent(
        tenantId,
        type === UsageEventType.MESSAGE_SENT ? "messages" : "ai",
        quantity
      );
      if (useMeterEvents) {
        if (type === UsageEventType.MESSAGE_SENT) {
          void reportMessageUsage({ tenantId, quantity, idempotencyKey: eventId }).then((r) => {
            if (!r.ok) {
              logSystemError({
                tenantId,
                context: "reportMessageUsage",
                error: new Error(r.error),
                metadata: { quantity },
              });
            }
          });
        } else {
          void reportAiUsage({ tenantId, quantity, idempotencyKey: eventId }).then((r) => {
            if (!r.ok) console.warn("[billing] reportAiUsage", tenantId, r.error);
          });
        }
      }
    } catch (e) {
      console.error("[billing/usage] trackUsage failed", tenantId, type, e);
    }
  })();
}

export interface UsagePeriodSummary {
  period: string;
  messagesSent: number;
  aiResponses: number;
}

export async function getUsageByPeriod(
  tenantId: string,
  period: string
): Promise<UsagePeriodSummary> {
  const agg = await prisma.usageAggregate.findUnique({
    where: { tenantId_period: { tenantId, period } },
  });
  if (agg) {
    return {
      period,
      messagesSent: agg.messagesCount,
      aiResponses: agg.aiCount,
    };
  }
  const { gte, lte } = periodBounds(period);
  const [msg, ai] = await Promise.all([
    prisma.usageEvent.aggregate({
      where: {
        tenantId,
        type: UsageEventType.MESSAGE_SENT,
        createdAt: { gte, lte },
      },
      _sum: { quantity: true },
    }),
    prisma.usageEvent.aggregate({
      where: {
        tenantId,
        type: UsageEventType.AI_RESPONSE,
        createdAt: { gte, lte },
      },
      _sum: { quantity: true },
    }),
  ]);
  return {
    period,
    messagesSent: msg._sum.quantity ?? 0,
    aiResponses: ai._sum.quantity ?? 0,
  };
}

function periodBounds(yyyyMm: string): { gte: Date; lte: Date } {
  const [y, m] = yyyyMm.split("-").map(Number);
  const gte = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const lte = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { gte, lte };
}

/** Recalcula agregado a partir dos eventos (reparo / consistência). */
export async function refreshAggregateForPeriod(tenantId: string, period: string): Promise<void> {
  const { gte, lte } = periodBounds(period);
  const [msg, ai] = await Promise.all([
    prisma.usageEvent.aggregate({
      where: {
        tenantId,
        type: UsageEventType.MESSAGE_SENT,
        createdAt: { gte, lte },
      },
      _sum: { quantity: true },
    }),
    prisma.usageEvent.aggregate({
      where: {
        tenantId,
        type: UsageEventType.AI_RESPONSE,
        createdAt: { gte, lte },
      },
      _sum: { quantity: true },
    }),
  ]);
  await prisma.usageAggregate.upsert({
    where: { tenantId_period: { tenantId, period } },
    create: {
      tenantId,
      period,
      messagesCount: msg._sum.quantity ?? 0,
      aiCount: ai._sum.quantity ?? 0,
    },
    update: {
      messagesCount: msg._sum.quantity ?? 0,
      aiCount: ai._sum.quantity ?? 0,
    },
  });
}

export async function checkUsageWithinLimits(
  tenantId: string,
  plan: string | null | undefined
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isBillingEnforceLimits()) return { ok: true };
  const limits = getPlanLimits(normalizePlanKey(plan));
  const period = periodYYYYMM();
  const usage = await getUsageByPeriod(tenantId, period);
  if (limits.messagesPerMonth != null && usage.messagesSent >= limits.messagesPerMonth) {
    return { ok: false, reason: "Limite mensal de mensagens atingido para o plano." };
  }
  if (limits.aiResponsesPerMonth != null && usage.aiResponses >= limits.aiResponsesPerMonth) {
    return { ok: false, reason: "Limite mensal de respostas IA atingido." };
  }
  return { ok: true };
}

export async function checkAiUsageAllowsNext(
  tenantId: string,
  plan: string | null | undefined
): Promise<boolean> {
  if (!isBillingEnforceLimits()) return true;
  const limits = getPlanLimits(normalizePlanKey(plan));
  const period = periodYYYYMM();
  const u = await getUsageByPeriod(tenantId, period);
  if (limits.messagesPerMonth != null && u.messagesSent + 1 > limits.messagesPerMonth) {
    return false;
  }
  if (limits.aiResponsesPerMonth != null && u.aiResponses + 1 > limits.aiResponsesPerMonth) {
    return false;
  }
  return true;
}

export async function getStripeUsageSyncStats(
  tenantId: string,
  period: string
): Promise<{
  messagesTotal: number;
  messagesReported: number;
  aiTotal: number;
  aiReported: number;
  pendingCount: number;
}> {
  if (isMeterEventsConfigured()) {
    const sub = await prisma.billingSubscription.findUnique({
      where: { tenantId },
      select: { messagesOverageSent: true, aiOverageSent: true },
    });
    const usage = await getUsageByPeriod(tenantId, period);
    return {
      messagesTotal: usage.messagesSent,
      messagesReported: sub?.messagesOverageSent ?? 0,
      aiTotal: usage.aiResponses,
      aiReported: sub?.aiOverageSent ?? 0,
      pendingCount: 0,
    };
  }
  const { gte, lte } = periodBounds(period);
  const [msgTotal, msgReported, aiTotal, aiReported, pending] = await Promise.all([
    prisma.usageEvent.aggregate({
      where: {
        tenantId,
        type: UsageEventType.MESSAGE_SENT,
        createdAt: { gte, lte },
      },
      _sum: { quantity: true },
    }),
    prisma.usageEvent.aggregate({
      where: {
        tenantId,
        type: UsageEventType.MESSAGE_SENT,
        createdAt: { gte, lte },
        reportedToStripeAt: { not: null },
      },
      _sum: { quantity: true },
    }),
    prisma.usageEvent.aggregate({
      where: {
        tenantId,
        type: UsageEventType.AI_RESPONSE,
        createdAt: { gte, lte },
      },
      _sum: { quantity: true },
    }),
    prisma.usageEvent.aggregate({
      where: {
        tenantId,
        type: UsageEventType.AI_RESPONSE,
        createdAt: { gte, lte },
        reportedToStripeAt: { not: null },
      },
      _sum: { quantity: true },
    }),
    prisma.usageEvent.count({
      where: {
        tenantId,
        createdAt: { gte, lte },
        reportedToStripeAt: null,
        stripeReportAttempts: { lt: 8 },
      },
    }),
  ]);
  return {
    messagesTotal: msgTotal._sum.quantity ?? 0,
    messagesReported: msgReported._sum.quantity ?? 0,
    aiTotal: aiTotal._sum.quantity ?? 0,
    aiReported: aiReported._sum.quantity ?? 0,
    pendingCount: pending,
  };
}
