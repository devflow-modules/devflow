/**
 * Resposta e guards de fallback quando o LLM falha ou é inseguro.
 * Genérico; mensagem padrão configurável pelo produto.
 */

export const DEFAULT_FALLBACK_MESSAGE = "Desculpe, não consegui processar sua mensagem no momento. Tente novamente em instantes.";

export function getFallbackMessage(custom?: string): string {
  return (custom ?? DEFAULT_FALLBACK_MESSAGE).trim() || DEFAULT_FALLBACK_MESSAGE;
}

/** Bloqueia conteúdo que parece sensível (ex.: tokens, chaves). */
export function safetyGuard(text: string): boolean {
  if (!text || text.length > 20000) return false;
  const lower = text.toLowerCase();
  if (/\b(sk-|api[_-]?key|password|secret)\s*[:=]/i.test(lower)) return false;
  return true;
}
