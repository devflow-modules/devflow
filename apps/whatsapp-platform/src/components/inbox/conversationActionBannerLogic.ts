import type { WaInboxThreadRow } from "./inboxTypes";
import type { InboxConversationState } from "./inboxTypes";
import { threadNeedsAgentReply } from "./messageOutboundKind";

export type ConversationBannerVariant =
  | { kind: "high_wait"; minutes: number }
  | { kind: "negotiation_stalled"; minutes: number }
  | { kind: "customer_waiting" }
  | null;

function minutesSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 60_000));
}

/**
 * Decide se mostra banner de acção no topo do chat (sem chamadas de rede).
 */
export function computeConversationActionBanner(thread: WaInboxThreadRow | null): ConversationBannerVariant {
  if (!thread || thread.status === "CLOSED") return null;

  const state = thread.conversationState as InboxConversationState | undefined;
  const needsHuman = threadNeedsAgentReply(thread);
  const priority = thread.priority;
  const lastPending =
    thread.lastUnansweredInboundAt ?? thread.lastCustomerMessageAt ?? thread.lastMessageAt;
  const waitMin = Math.max(1, minutesSince(lastPending) ?? 1);

  if (priority === "HIGH" && (state === "awaiting_agent" || needsHuman)) {
    return { kind: "high_wait", minutes: waitMin };
  }

  const ai = thread.aiState?.toLowerCase();
  const stallMin = minutesSince(thread.lastMessageAt);
  if (ai === "negotiating" && stallMin !== null && stallMin >= 30 && state !== "awaiting_agent") {
    return { kind: "negotiation_stalled", minutes: stallMin };
  }

  if (state === "awaiting_agent" || needsHuman) {
    return { kind: "customer_waiting" };
  }

  return null;
}

export function bannerLabel(v: ConversationBannerVariant): string {
  if (!v) return "";
  if (v.kind === "high_wait") {
    return `Lead HIGH aguardando resposta há ${v.minutes} min`;
  }
  if (v.kind === "negotiation_stalled") {
    return `Negociação parada há ${v.minutes} min`;
  }
  return "Cliente aguardando resposta";
}
