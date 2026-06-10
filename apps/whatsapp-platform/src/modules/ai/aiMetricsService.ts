import { prisma } from "@/lib/prisma";

export interface AiOperationalMetrics {
  totalMessages: number;
  autoReplies: number;
  fallbacks: number;
  errors: number;
  blockedDecisions: number;
  avgLatencyMs: number;
  periodDays: number;
}

/** Agrega `ai_message_logs` por tenant (janela recente). */
export async function getAiOperationalMetrics(
  tenantId: string,
  days = 30
): Promise<AiOperationalMetrics> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.aiMessageLog.findMany({
    where: { tenantId, createdAt: { gte: since } },
    select: { eventKind: true, durationMs: true },
  });

  let autoReplies = 0;
  let fallbacks = 0;
  let errors = 0;
  let blockedDecisions = 0;
  let latencySum = 0;
  let latencyN = 0;

  for (const r of rows) {
    switch (r.eventKind) {
      case "auto_reply":
        autoReplies++;
        break;
      case "fallback":
        fallbacks++;
        break;
      case "error":
        errors++;
        break;
      case "blocked_by_guard":
      case "handoff_requested":
      case "blocked":
        blockedDecisions++;
        break;
      default:
        break;
    }
    if (typeof r.durationMs === "number" && r.durationMs >= 0) {
      latencySum += r.durationMs;
      latencyN++;
    }
  }

  const totalMessages = rows.length;
  const avgLatencyMs = latencyN > 0 ? Math.round(latencySum / latencyN) : 0;

  return {
    totalMessages,
    autoReplies,
    fallbacks,
    errors,
    blockedDecisions,
    avgLatencyMs,
    periodDays: days,
  };
}

/** % de respostas automáticas face ao total de eventos registados no período. */
export function computeAutomationPercent(m: AiOperationalMetrics): number | null {
  if (m.totalMessages <= 0) return null;
  return Math.round((m.autoReplies / m.totalMessages) * 1000) / 10;
}
