/**
 * Normaliza rótulos de formulário Easy Apply para comparação heurística.
 */
export function normalizeLinkedInLabel(label: string): string {
  return label
    .replace(/\u00a0/g, " ")
    /** Remove marcações comuns de campo obrigatório no início */
    .replace(/^\s*\*+\s*/, "")
    .replace(/\s*\(opcional\)\s*$/i, "")
    .replace(/\s*\(optional\)\s*$/i, "")
    .replace(/[*:•]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
