import { ANTHROPIC_MODELS } from "@/modules/ai/schemas/aiConfigSchemas";

/**
 * Configuração de IA que exige plano Scale (ADVANCED_AI): motor Claude, modelo GPT‑4o ou modelos Anthropic.
 */
export function aiRuntimeRequiresAdvancedAi(params: {
  effectiveDriver: string | null | undefined;
  model: string;
}): boolean {
  const m = params.model.trim();
  if (params.effectiveDriver === "claude") return true;
  if (m === "gpt-4o") return true;
  return (ANTHROPIC_MODELS as readonly string[]).includes(m);
}
