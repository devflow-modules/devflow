/**
 * Formatação genérica de resposta (trim, limite de tamanho).
 * Produtos podem aplicar formatação específica depois.
 */

const MAX_RESPONSE_LENGTH = 4096;

export function formatResponse(raw: string, maxLength = MAX_RESPONSE_LENGTH): string {
  const trimmed = raw.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const cut = trimmed.slice(0, maxLength - 3);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > maxLength / 2) return cut.slice(0, lastSpace) + "...";
  return cut + "...";
}
