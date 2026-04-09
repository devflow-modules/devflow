import type { WaInboxThreadRow } from "./inboxTypes";

/** Tempo mínimo após última resposta do agente antes de sugerir follow-up (4h). */
export const FOLLOW_UP_MIN_DELAY_MS = 4 * 60 * 60 * 1000;

const DEFAULT_FOLLOW_UP_TEXT =
  "Olá! Só passando para saber se conseguiu ver a minha última mensagem ou se precisa de mais alguma coisa. Estou à disposição.";

/**
 * Follow-up quando o estado é «à espera do cliente» e já passou tempo desde a última saída do agente.
 * `nowMs` injetável para testes.
 */
export function followUpSuggestion(
  thread: WaInboxThreadRow | null,
  nowMs: number = Date.now()
): { show: boolean; delayExceededMs: number; suggestedText: string } | null {
  if (!thread || thread.conversationState !== "awaiting_customer") return null;
  const anchor = thread.lastAgentReplyAt ?? thread.lastMessageAt;
  if (!anchor) return null;
  const last = new Date(anchor).getTime();
  const elapsed = nowMs - last;
  if (elapsed < FOLLOW_UP_MIN_DELAY_MS) {
    return { show: false, delayExceededMs: elapsed, suggestedText: DEFAULT_FOLLOW_UP_TEXT };
  }
  return { show: true, delayExceededMs: elapsed, suggestedText: DEFAULT_FOLLOW_UP_TEXT };
}
