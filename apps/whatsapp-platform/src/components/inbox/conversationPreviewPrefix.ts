import type { WaInboxThreadRow } from "./inboxTypes";

/**
 * Prefixo de pré-visualização na lista (sem novos campos de API).
 * Última outbound: inferimos origem via `lastResponderType`; última inbound: `null` → Cliente.
 */
export function conversationPreviewPrefix(thread: WaInboxThreadRow): string {
  const k = thread.lastResponderType;
  if (k === "ai") return "IA";
  if (k === "automation") return "Auto";
  if (k === "agent") return "Você";
  return "Cliente";
}
