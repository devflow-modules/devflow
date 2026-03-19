import { prisma } from "@/lib/prisma";

export type DateRange = { dateFrom?: Date; dateTo?: Date };

export async function getConversationStats(
  tenantId: string,
  range?: DateRange
): Promise<{
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConversation: number;
  messagesByDay: { date: string; count: number }[];
}> {
  const where: { conversation: { tenantId: string }; timestamp?: { gte?: Date; lte?: Date } } = {
    conversation: { tenantId },
  };
  if (range?.dateFrom || range?.dateTo) {
    where.timestamp = {};
    if (range.dateFrom) where.timestamp.gte = range.dateFrom;
    if (range.dateTo) where.timestamp.lte = range.dateTo;
  }

  const messages = await prisma.message.findMany({
    where,
    select: { id: true, conversationId: true, timestamp: true, sender: true },
    orderBy: { timestamp: "asc" },
  });

  const convIds = [...new Set(messages.map((m) => m.conversationId))];
  const totalConversations = convIds.length;
  const totalMessages = messages.length;
  const avgMessagesPerConversation =
    totalConversations > 0 ? Math.round((totalMessages / totalConversations) * 10) / 10 : 0;

  const byDay: Record<string, number> = {};
  for (const m of messages) {
    const d = m.timestamp.toISOString().slice(0, 10);
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
  const where: { conversation: { tenantId: string }; agentId: { not: null }; timestamp?: { gte?: Date; lte?: Date } } = {
    conversation: { tenantId },
    agentId: { not: null },
  };
  if (range?.dateFrom || range?.dateTo) {
    where.timestamp = {};
    if (range.dateFrom) where.timestamp.gte = range.dateFrom;
    if (range.dateTo) where.timestamp.lte = range.dateTo;
  }

  const messages = await prisma.message.findMany({
    where,
    select: { agentId: true, conversationId: true, responseTimeMs: true },
  });

  const byAgent: Record<string, { conversations: Set<string>; responseTimeSum: number; responseTimeCount: number; messagesCount: number }> = {};
  for (const m of messages) {
    const aid = m.agentId!;
    if (!byAgent[aid]) {
      byAgent[aid] = { conversations: new Set(), responseTimeSum: 0, responseTimeCount: 0, messagesCount: 0 };
    }
    byAgent[aid].conversations.add(m.conversationId);
    byAgent[aid].messagesCount++;
    if (m.responseTimeMs != null) {
      byAgent[aid].responseTimeSum += m.responseTimeMs;
      byAgent[aid].responseTimeCount++;
    }
  }

  const byAgentList = Object.entries(byAgent).map(([agentId, data]) => ({
    agentId,
    conversationsCount: data.conversations.size,
    avgResponseTimeMs: data.responseTimeCount > 0 ? Math.round(data.responseTimeSum / data.responseTimeCount) : 0,
    messagesCount: data.messagesCount,
  }));

  return { byAgent: byAgentList };
}

export async function getIntentDistribution(
  tenantId: string,
  range?: DateRange
): Promise<{ intent: string; count: number }[]> {
  const where: { conversation: { tenantId: string }; intent: { not: null }; timestamp?: { gte?: Date; lte?: Date } } = {
    conversation: { tenantId },
    intent: { not: null },
  };
  if (range?.dateFrom || range?.dateTo) {
    where.timestamp = {};
    if (range.dateFrom) where.timestamp.gte = range.dateFrom;
    if (range.dateTo) where.timestamp.lte = range.dateTo;
  }

  const messages = await prisma.message.findMany({
    where,
    select: { intent: true },
  });

  const counts: Record<string, number> = {};
  for (const m of messages) {
    const i = m.intent ?? "unknown";
    counts[i] = (counts[i] ?? 0) + 1;
  }
  return Object.entries(counts).map(([intent, count]) => ({ intent, count }));
}

export async function getOverviewMetrics(tenantId: string, range?: DateRange): Promise<{
  totalMessages: number;
  automaticMessages: number;
  humanMessages: number;
  avgResponseTimeMs: number;
}> {
  const where: { conversation: { tenantId: string }; timestamp?: { gte?: Date; lte?: Date } } = {
    conversation: { tenantId },
  };
  if (range?.dateFrom || range?.dateTo) {
    where.timestamp = {};
    if (range.dateFrom) where.timestamp.gte = range.dateFrom;
    if (range.dateTo) where.timestamp.lte = range.dateTo;
  }

  const messages = await prisma.message.findMany({
    where,
    select: { sender: true, responseTimeMs: true, agentId: true },
  });

  const human = messages.filter((m) => m.sender !== "user" && m.agentId != null).length;
  const automatic = messages.filter((m) => m.sender !== "user" && m.agentId == null).length;
  const withTime = messages.filter((m) => m.responseTimeMs != null);
  const avgResponseTimeMs =
    withTime.length > 0 ? Math.round(withTime.reduce((s, m) => s + (m.responseTimeMs ?? 0), 0) / withTime.length) : 0;

  return {
    totalMessages: messages.length,
    automaticMessages: automatic,
    humanMessages: human,
    avgResponseTimeMs,
  };
}
