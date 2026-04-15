import { prisma } from "@/lib/prisma";
import { WaInboxDirection } from "@/generated/prisma-whatsapp";

export type DateRange = { dateFrom?: Date; dateTo?: Date };

function tsWhere(range?: DateRange): { gte?: Date; lte?: Date } | undefined {
  if (!range?.dateFrom && !range?.dateTo) return undefined;
  const w: { gte?: Date; lte?: Date } = {};
  if (range.dateFrom) w.gte = range.dateFrom;
  if (range.dateTo) w.lte = range.dateTo;
  return w;
}

function outboundKind(m: { contentJson: unknown }): string | undefined {
  const j = m.contentJson;
  if (j && typeof j === "object" && "outboundKind" in j) {
    const v = (j as { outboundKind?: unknown }).outboundKind;
    return typeof v === "string" ? v : undefined;
  }
  return undefined;
}

export async function getConversationStats(
  tenantId: string,
  range?: DateRange
): Promise<{
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConversation: number;
  messagesByDay: { date: string; count: number }[];
}> {
  const tw = tsWhere(range);
  const messages = await prisma.waInboxMessage.findMany({
    where: {
      tenantId,
      ...(tw ? { ts: tw } : {}),
    },
    select: { id: true, threadId: true, ts: true },
    orderBy: { ts: "asc" },
  });

  const convIds = [...new Set(messages.map((m) => m.threadId))];
  const totalConversations = convIds.length;
  const totalMessages = messages.length;
  const avgMessagesPerConversation =
    totalConversations > 0 ? Math.round((totalMessages / totalConversations) * 10) / 10 : 0;

  const byDay: Record<string, number> = {};
  for (const m of messages) {
    const d = m.ts.toISOString().slice(0, 10);
    byDay[d] = (byDay[d] ?? 0) + 1;
  }
  const messagesByDay = Object.entries(byDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalConversations,
    totalMessages,
    avgMessagesPerConversation,
    messagesByDay,
  };
}

export async function getAgentPerformance(
  tenantId: string,
  range?: DateRange
): Promise<{
  byAgent: { agentId: string; conversationsCount: number; avgResponseTimeMs: number; messagesCount: number }[];
}> {
  const tw = tsWhere(range);
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true },
  });

  const byAgentList: {
    agentId: string;
    conversationsCount: number;
    avgResponseTimeMs: number;
    messagesCount: number;
  }[] = [];

  for (const u of users) {
    const threadIds = (
      await prisma.waInboxThread.findMany({
        where: { tenantId, assignedToUserId: u.id },
        select: { id: true },
      })
    ).map((t) => t.id);

    const conversationsCount = threadIds.length;
    const messagesCount =
      threadIds.length === 0
        ? 0
        : await prisma.waInboxMessage.count({
            where: {
              tenantId,
              threadId: { in: threadIds },
              ...(tw ? { ts: tw } : {}),
            },
          });

    byAgentList.push({
      agentId: u.id,
      conversationsCount,
      avgResponseTimeMs: 0,
      messagesCount,
    });
  }

  return { byAgent: byAgentList.filter((a) => a.conversationsCount > 0 || a.messagesCount > 0) };
}

export async function getIntentDistribution(
  tenantId: string,
  range?: DateRange
): Promise<{ intent: string; count: number }[]> {
  void tenantId;
  void range;
  return [];
}

export async function getOverviewMetrics(tenantId: string, range?: DateRange): Promise<{
  totalMessages: number;
  automaticMessages: number;
  humanMessages: number;
  avgResponseTimeMs: number;
}> {
  const tw = tsWhere(range);
  const messages = await prisma.waInboxMessage.findMany({
    where: {
      tenantId,
      ...(tw ? { ts: tw } : {}),
    },
    select: { direction: true, contentJson: true },
  });

  const outbound = messages.filter((m) => m.direction === WaInboxDirection.OUTBOUND);
  let human = 0;
  let automatic = 0;
  for (const m of outbound) {
    const k = outboundKind(m);
    if (k === "agent") human++;
    else automatic++;
  }

  return {
    totalMessages: messages.length,
    automaticMessages: automatic,
    humanMessages: human,
    avgResponseTimeMs: 0,
  };
}
