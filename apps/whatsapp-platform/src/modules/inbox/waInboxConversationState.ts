/**
 * Estado derivado da inbox (WhatsApp-like): pendência real e último interveniente.
 */

import { parseOutboundKindFromContentJson } from "@/modules/messaging/automaticReplyGuard";

export type ConversationState =
  | "awaiting_agent"
  | "in_progress"
  | "awaiting_customer"
  | "closed";

export type LastResponderType = "agent" | "ai" | "automation" | null;

/**
 * Rank 0–3 para ordenação da lista (awaiting_agent → in_progress → awaiting_customer → closed).
 * Deve manter-se alinhado com ORDER BY em `waInboxQueries.waInboxListThreads`.
 */
export function inboxListSortRank(input: {
  threadStatus: string;
  assignedToUserId: string | null;
  unansweredInboundCount: number;
}): number {
  if (input.threadStatus === "CLOSED") return 3;
  if (input.unansweredInboundCount > 0) return 0;
  if (input.assignedToUserId) return 1;
  return 2;
}

export function deriveConversationState(input: {
  threadStatus: string;
  assignedToUserId: string | null;
  unansweredInboundCount: number;
}): ConversationState {
  const r = inboxListSortRank(input);
  if (r === 3) return "closed";
  if (r === 0) return "awaiting_agent";
  if (r === 1) return "in_progress";
  return "awaiting_customer";
}

/**
 * Conta inbounds após o último outbound (qualquer agent/ai/automation).
 * Sem outbound: todas as inbounds contam.
 */
export function computeUnansweredInboundCount(
  messages: Array<{ direction: "INBOUND" | "OUTBOUND"; ts: Date }>
): number {
  if (messages.length === 0) return 0;
  const sorted = [...messages].sort((a, b) => a.ts.getTime() - b.ts.getTime());
  let lastOutboundTs: Date | null = null;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].direction === "OUTBOUND") {
      lastOutboundTs = sorted[i].ts;
      break;
    }
  }
  if (lastOutboundTs === null) {
    return sorted.filter((m) => m.direction === "INBOUND").length;
  }
  return sorted.filter(
    (m) => m.direction === "INBOUND" && m.ts.getTime() > lastOutboundTs!.getTime()
  ).length;
}

export function lastResponderTypeFromLastMessage(
  lastDirection: string | null | undefined,
  contentJson: unknown
): LastResponderType {
  if (lastDirection !== "OUTBOUND") return null;
  const kind = parseOutboundKindFromContentJson(contentJson);
  return kind;
}

export const CONVERSATION_STATE_ORDER: Record<ConversationState, number> = {
  awaiting_agent: 0,
  in_progress: 1,
  awaiting_customer: 2,
  closed: 3,
};

/** Ordem de secções na lista (igual à ordenação do servidor). */
export const INBOX_CONVERSATION_GROUP_ORDER: readonly ConversationState[] = [
  "awaiting_agent",
  "in_progress",
  "awaiting_customer",
  "closed",
] as const;

export const CONVERSATION_STATE_LABELS: Record<ConversationState, string> = {
  awaiting_agent: "A responder",
  in_progress: "Em atendimento",
  awaiting_customer: "À espera do cliente",
  closed: "Fechada",
};

/** Secções da sidebar (ação): ordem de prioridade visual. */
export type InboxSidebarSection =
  | "awaiting_agent"
  | "unassigned"
  | "in_progress"
  | "awaiting_customer"
  | "closed";

export const INBOX_SIDEBAR_SECTION_ORDER: readonly InboxSidebarSection[] = [
  "awaiting_agent",
  "unassigned",
  "in_progress",
  "awaiting_customer",
  "closed",
] as const;

export const INBOX_SIDEBAR_SECTION_LABELS: Record<InboxSidebarSection, string> = {
  awaiting_agent: "Precisa de resposta",
  unassigned: "Sem responsável",
  in_progress: "Em atendimento",
  awaiting_customer: "Aguardando cliente",
  closed: "Fechadas",
};

export type ThreadLikeForSidebar = {
  conversationState?: ConversationState;
  status: string;
  unansweredInboundCount?: number;
  assignedToUser?: { id: string } | null;
  isUnassigned?: boolean;
};

/** Alinha com a lista API quando `conversationState` falta. */
export function inferConversationStateForGrouping(t: ThreadLikeForSidebar): ConversationState {
  if (t.conversationState) return t.conversationState;
  if (t.status === "CLOSED") return "closed";
  if ((t.unansweredInboundCount ?? 0) > 0) return "awaiting_agent";
  if (t.assignedToUser) return "in_progress";
  return "awaiting_customer";
}

/**
 * Uma thread aparece numa única secção: prioridade a quem precisa de resposta;
 * depois conversas sem responsável (sem duplicar em "aguardando cliente").
 */
export function threadSidebarSection(t: ThreadLikeForSidebar): InboxSidebarSection {
  const state = inferConversationStateForGrouping(t);
  if (state === "closed") return "closed";
  if (state === "awaiting_agent") return "awaiting_agent";
  /** À espera do cliente (ex.: IA já respondeu) — não misturar com «Sem responsável». */
  if (state === "awaiting_customer") return "awaiting_customer";
  const noOwner = Boolean(t.isUnassigned || !t.assignedToUser);
  if (noOwner) return "unassigned";
  if (state === "in_progress") return "in_progress";
  return "in_progress";
}
