/**
 * Rótulo emocional do mês (retenção) — alinhado às faixas do score 0–100.
 * Diferente do badge técnico do motor (Crítico / Atenção / …).
 */
export function getFinanceiroMonthEmotionalLabel(score: number): string {
  if (score <= 30) return "Desorganizado";
  if (score <= 60) return "Precisa de atenção";
  if (score <= 85) return "Em progresso";
  return "Sob controle";
}

export function getFinanceiroMonthEmotionalLine(score: number): string {
  const label = getFinanceiroMonthEmotionalLabel(score);
  return `Seu mês está ${label.toLowerCase()} (${score}%)`;
}
