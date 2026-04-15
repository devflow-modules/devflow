import type { ConversationState } from "@/modules/inbox/waInboxConversationState";

/** UI apenas — fonte de verdade continua a ser `thread.conversationState` (derivado no backend). */
const BADGE: Record<
  ConversationState,
  { label: string; className: string }
> = {
  awaiting_agent: {
    label: "Precisa resposta",
    className:
      "rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-900 ring-1 ring-red-200/90 shadow-sm",
  },
  in_progress: {
    label: "Em atendimento",
    className:
      "rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-900 ring-1 ring-sky-200/90 shadow-sm",
  },
  awaiting_customer: {
    label: "Aguardando cliente",
    className:
      "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 ring-1 ring-amber-200/90 shadow-sm",
  },
  closed: {
    label: "Encerrada",
    className:
      "rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200/90",
  },
};

export function getConversationStateBadge(state: ConversationState | null | undefined) {
  if (!state) return null;
  return BADGE[state];
}

/** Texto curto para o painel lateral — só orientação, sem alterar fluxos. */
export function conversationStateOperationalHint(state: ConversationState | null | undefined): string | null {
  switch (state) {
    case "awaiting_agent":
      return "Prioridade: assumir ou responder no editor.";
    case "in_progress":
      return "Em atendimento: atualize o cliente ou aguarde a resposta dele.";
    case "awaiting_customer":
      return "Última palavra foi sua ou da equipa — pode retomar ou encerrar se resolvido.";
    case "closed":
      return "Conversa encerrada — reabra só se o cliente voltar a precisar de suporte.";
    default:
      return null;
  }
}

/** Bullets para o painel lateral — só orientação; ações reais ficam no cabeçalho. */
export function conversationStateSuggestedActions(
  state: ConversationState | null | undefined
): readonly string[] {
  switch (state) {
    case "awaiting_agent":
      return [
        "No cabeçalho: destacar “Assumir conversa” se ainda não for o responsável.",
        "Responder no editor — Enter envia, Shift+Enter quebra linha.",
      ];
    case "in_progress":
      return [
        "Manter o cliente informado (atalho “Aguardar” no compositor).",
        "Quando concluir: “Encerrar” no cabeçalho.",
      ];
    case "awaiting_customer":
      return [
        "Se fizer sentido, retomar com uma mensagem cordial.",
        "Se estiver resolvido: encerrar a conversa.",
      ];
    case "closed":
      return ["Só reabrir se o cliente voltar a precisar de suporte."];
    default:
      return [];
  }
}
