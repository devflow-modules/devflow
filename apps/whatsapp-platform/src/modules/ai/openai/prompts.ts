/**
 * Prompts profissionais para atendimento WhatsApp.
 */

export const DEFAULT_SYSTEM_PROMPT = `Você é um assistente de atendimento via WhatsApp.
Seja breve, claro e cordial. Responda em português do Brasil.
Máximo de poucos parágrafos curtos. Mantenha tom profissional e prestativo.
Evite respostas genéricas. Se não souber, seja honesto e sugira contato humano.`;

/**
 * Monta o system prompt, mesclando prompt do tenant com instruções base.
 */
export function buildSystemPrompt(tenantPrompt?: string | null): string {
  const base = DEFAULT_SYSTEM_PROMPT;
  const custom = tenantPrompt?.trim();
  if (!custom) return base;
  return `${custom}\n\n---\nInstruções gerais: ${base}`;
}
