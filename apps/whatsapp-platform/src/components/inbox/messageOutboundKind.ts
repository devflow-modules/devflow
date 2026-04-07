import type { WaInboxMessageRow } from "./inboxTypes";

export type OutboundUiKind = "ai" | "automation" | "agent" | null;

export function getOutboundKindFromMessage(message: WaInboxMessageRow): OutboundUiKind {
  if (message.direction !== "OUTBOUND") return null;
  const j = message.contentJson;
  if (j && typeof j === "object" && !Array.isArray(j) && "outboundKind" in j) {
    const k = (j as { outboundKind?: string }).outboundKind;
    if (k === "ai" || k === "automation" || k === "agent") return k;
  }
  return "agent";
}

/** Cliente escreveu por último e está à espera de resposta da equipa/bot. */
export function threadNeedsAgentReply(thread: {
  lastCustomerMessageAt?: string | null;
  lastAgentReplyAt?: string | null;
}): boolean {
  const lc = thread.lastCustomerMessageAt ? new Date(thread.lastCustomerMessageAt).getTime() : 0;
  if (!lc) return false;
  const la = thread.lastAgentReplyAt ? new Date(thread.lastAgentReplyAt).getTime() : 0;
  return !la || la < lc;
}
