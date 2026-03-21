/**
 * Estimativa de custo por mensagem (gpt-4o-mini).
 * Valores aproximados; consultar pricing OpenAI para precisão.
 */

// gpt-4o-mini (aproximado USD/1M tokens)
const INPUT_PRICE_PER_1M = 0.15;
const OUTPUT_PRICE_PER_1M = 0.6;

export function estimateCostUsd(
  inputTokens: number,
  outputTokens: number,
  model = "gpt-4o-mini"
): number {
  if (model.includes("gpt-4o") && !model.includes("gpt-4o-mini")) {
    return (inputTokens / 1_000_000) * 2.5 + (outputTokens / 1_000_000) * 10;
  }
  return (
    (inputTokens / 1_000_000) * INPUT_PRICE_PER_1M +
    (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_1M
  );
}

/**
 * Estima custo quando só temos total_tokens (sem split).
 */
export function estimateCostFromTotal(totalTokens: number, model = "gpt-4o-mini"): number {
  const inputEst = Math.floor(totalTokens * 0.7);
  const outputEst = totalTokens - inputEst;
  return estimateCostUsd(inputEst, outputEst, model);
}
