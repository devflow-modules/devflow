/** Textos amigáveis para o painel lateral (sem jargão técnico). */

export function leadScoreHumanLabel(score: number): string {
  if (score >= 75) return "muito interessado";
  if (score >= 50) return "alto interesse";
  if (score >= 25) return "interesse moderado";
  return "ainda a explorar";
}

export function aiStateFriendlyLabel(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const s = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    lead: "Primeiro contacto",
    qualifying: "A qualificar necessidade",
    negotiating: "Em negociação (a fechar)",
    support: "Suporte ou dúvida",
    closed: "Conversa encerrada",
  };
  return map[s] ?? raw;
}

export function priorityGuidance(priority: string | undefined): { line: string; tooltip: string } | null {
  switch (priority) {
    case "HIGH":
      return {
        line: "Responder rápido",
        tooltip: "Prioridade alta: o cliente espera uma resposta humana o quanto antes.",
      };
    case "MEDIUM":
      return {
        line: "Atenção",
        tooltip: "Prioridade média: acompanhe e responda em tempo útil.",
      };
    case "LOW":
      return {
        line: "Baixa prioridade",
        tooltip: "Pode tratar quando estiver disponível; sem urgência imediata.",
      };
    default:
      return null;
  }
}
