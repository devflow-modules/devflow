import { prisma } from "@/lib/prisma";

export type AiLogEventType = "auto_reply" | "fallback" | "error" | "blocked_by_guard";

export type AiLogListItem = {
  type: AiLogEventType;
  reason: string;
  createdAt: string;
  conversationId: string | null;
};

const API_TYPES = new Set<AiLogEventType>(["auto_reply", "fallback", "error", "blocked_by_guard"]);

function mapDbEventKindToApi(db: string): AiLogEventType {
  if (db === "blocked" || db === "blocked_by_guard") return "blocked_by_guard";
  if (db === "fallback") return "fallback";
  if (db === "error") return "error";
  return "auto_reply";
}

function reasonFromRow(row: {
  eventKind: string;
  decisionReason: string | null;
  errorMessage: string | null;
}): string {
  if (row.decisionReason?.trim()) return row.decisionReason.trim();
  if (row.errorMessage?.trim()) return row.errorMessage.trim();
  if (row.eventKind === "auto_reply") return "ok";
  return "—";
}

/**
 * Lista recente de eventos operacionais de IA (sem conteúdo de mensagens).
 */
export async function listRecentAiLogs(
  tenantId: string,
  opts: { limit: number; type?: AiLogEventType | null }
): Promise<AiLogListItem[]> {
  const take = Math.min(100, Math.max(1, opts.limit));
  const filterType = opts.type && API_TYPES.has(opts.type) ? opts.type : null;

  const eventKindWhere =
    filterType === null
      ? undefined
      : filterType === "blocked_by_guard"
        ? { in: ["blocked_by_guard", "blocked"] }
        : { equals: filterType };

  const rows = await prisma.aiMessageLog.findMany({
    where: {
      tenantId,
      ...(eventKindWhere ? { eventKind: eventKindWhere } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      eventKind: true,
      decisionReason: true,
      errorMessage: true,
      createdAt: true,
      waInboxThreadId: true,
    },
  });

  return rows.map((r) => ({
    type: mapDbEventKindToApi(r.eventKind),
    reason: reasonFromRow(r),
    createdAt: r.createdAt.toISOString(),
    conversationId: r.waInboxThreadId,
  }));
}
