/** Rótulo emocional do mês (retenção) — alinhado às faixas do sprint, não ao headline interno do motor. */
export function getMonthEmotionalSentence(score: number): string {
  if (score <= 30) return `Seu mês está desorganizado (${score}%)`;
  if (score <= 60) return `Seu mês precisa de atenção (${score}%)`;
  if (score <= 85) return `Seu mês está em progresso (${score}%)`;
  return `Seu mês está sob controle (${score}%)`;
}
