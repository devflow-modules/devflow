import type { HistoryPeriodPreset, HistoryPhaseFilter } from "./historyFetch";
import type { ConversationHistoryUrlState } from "./conversationHistoryUrlState";

export type ConversationHistoryQuickViewDefinition = {
  id: string;
  label: string;
  phase: HistoryPhaseFilter;
  preset: HistoryPeriodPreset;
};

/** Atalhos operacionais: apenas combinam `phase` / `preset` canónicos (#19). */
export const CONVERSATION_HISTORY_QUICK_VIEWS: ConversationHistoryQuickViewDefinition[] = [
  { id: "encerradas-recentes", label: "Encerradas recentes", phase: "closed", preset: "all" },
  { id: "todas-7d", label: "Todas — 7 dias", phase: "all", preset: "7d" },
  { id: "em-atendimento", label: "Em atendimento", phase: "in_attendance", preset: "all" },
  { id: "aguardando-cliente", label: "Aguardando cliente", phase: "awaiting_customer", preset: "all" },
  { id: "todas", label: "Todas", phase: "all", preset: "all" },
];

/**
 * Indica se o estado actual da URL corresponde exactamente a esta vista rápida
 * (sem busca, sem período personalizado; `businessPhoneNumberId` ignorado na comparação).
 */
export function matchesConversationHistoryQuickView(
  parsed: ConversationHistoryUrlState,
  view: ConversationHistoryQuickViewDefinition
): boolean {
  if (parsed.phase !== view.phase || parsed.preset !== view.preset) return false;
  if (parsed.search.trim()) return false;
  if (parsed.preset === "custom") return false;
  if (parsed.customFrom.trim() || parsed.customTo.trim()) return false;
  return true;
}

/** Estado URL completo para aplicar a vista, preservando a linha quando indicado. */
export function conversationHistoryQuickViewUrlState(
  view: ConversationHistoryQuickViewDefinition,
  options: { businessPhoneNumberId: string | null }
): ConversationHistoryUrlState {
  return {
    phase: view.phase,
    preset: view.preset,
    customFrom: "",
    customTo: "",
    search: "",
    businessPhoneNumberId: options.businessPhoneNumberId,
  };
}
