import type { WaInboxThreadRow } from "./inboxTypes";

/**
 * Sugestão curta para o operador, por estágio do funil IA.
 */
export function generateOperatorSuggestion(thread: WaInboxThreadRow | null): string | null {
  if (!thread) return null;
  const s = (thread.aiState ?? "lead").toLowerCase();

  switch (s) {
    case "lead":
      return "Pergunte em que podemos ajudar ou qual é a necessidade principal.";
    case "qualifying":
      return "Aprofunde: orçamento, prazo e critérios de escolha.";
    case "negotiating":
      return "Pergunte qual plano ou opção prefere e proponha o próximo passo (pagamento, demo, contrato).";
    case "support":
      return "Confirme o problema, peça detalhes e diga o que vai fazer a seguir.";
    case "closed":
      return "Agradeça e deixe a porta aberta para voltar a falar.";
    default:
      return "Mantenha tom cordial e confirme o próximo passo com o cliente.";
  }
}
