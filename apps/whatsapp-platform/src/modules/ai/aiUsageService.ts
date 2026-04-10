/**
 * Analytics de uso de IA — mensagens, tokens, fallback, custo.
 * Usado para visibilidade operacional e controle de custo.
 */

import { prisma } from "@/lib/prisma";
import { AiUsageLogType } from "@/generated/prisma-whatsapp";
import { estimateCostFromTotal } from "./openai";

export type AiUsageTrackType =
  | "MESSAGE_TOTAL"
  | "AI_SUCCESS"
  | "AI_FALLBACK"
  | "AI_TEST_RUN"
  | "AI_PROVIDER_ERROR";

/** Registra evento de uso de IA. Não bloqueia; falhas só em log. */
export function trackAiUsage(tenantId: string, type: AiUsageTrackType, tokens = 0): void {
  if (!tenantId || tenantId === "env") return;
  void prisma.aiUsageLog
    .create({
      data: {
        tenantId,
        type: type as AiUsageLogType,
        tokens: Math.max(0, tokens),
      },
    })
    .catch((e) => console.error("[aiUsage] trackAiUsage failed", tenantId, type, e));
}

export interface AiUsageMetrics {
  messagesTotal: number;
  aiMessagesTotal: number;
  fallbackTotal: number;
  tokensUsedTotal: number;
  estimatedCostUsd: number;
}

/** Retorna métricas agregadas do período atual (mês). */
export async function getAiUsageMetrics(
  tenantId: string,
  period?: string
): Promise<AiUsageMetrics> {
  const { gte, lte } = periodBounds(period ?? periodYYYYMM());

  const logs = await prisma.aiUsageLog.findMany({
    where: { tenantId, createdAt: { gte, lte } },
    select: { type: true, tokens: true },
  });

  let messagesTotal = 0;
  let aiMessagesTotal = 0;
  let fallbackTotal = 0;
  let tokensUsedTotal = 0;

  for (const log of logs) {
    if (log.type === "MESSAGE_TOTAL") messagesTotal++;
    else if (log.type === "AI_SUCCESS") {
      aiMessagesTotal++;
      tokensUsedTotal += log.tokens;
    } else if (log.type === "AI_FALLBACK") fallbackTotal++;
  }

  const estimatedCostUsd = tokensUsedTotal > 0
    ? estimateCostFromTotal(tokensUsedTotal)
    : 0;

  return {
    messagesTotal,
    aiMessagesTotal,
    fallbackTotal,
    tokensUsedTotal,
    estimatedCostUsd: Math.round(estimatedCostUsd * 100) / 100,
  };
}

export function periodYYYYMM(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function periodBounds(yyyyMm: string): { gte: Date; lte: Date } {
  const [y, m] = yyyyMm.split("-").map(Number);
  const gte = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const lte = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { gte, lte };
}
