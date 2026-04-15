import type { AiAgentConfig } from "@/generated/prisma-whatsapp";
import type { AiState } from "@/modules/ai/conversationStateService";

export type AutomationRulesResult = {
  /** Resposta fixa sem chamar LLM */
  shortCircuitReply: string | null;
  /** Texto extra no system prompt */
  promptAugmentation: string | null;
  /** Pedido explícito de revisão humana (registado em log) */
  markNeedsHuman: boolean;
};

const OPENING_FALLBACK = "Olá! Sou o assistente virtual. Em que posso ajudar?";

function isVeryShortGreeting(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length === 0) return false;
  if (t.length <= 3) {
    return ["oi", "ola", "olá", "ei", "ok", "👋"].includes(t);
  }
  return false;
}

/**
 * Regras leves antes do LLM — sem duplicar o guard (palavras sensíveis, horário, etc.).
 */
export function evaluateAutomationRules(input: {
  messageText: string;
  aiState: AiState;
  config: AiAgentConfig;
}): AutomationRulesResult {
  const text = input.messageText ?? "";
  const lower = text.toLowerCase();
  let promptAugmentation: string | null = null;
  const markNeedsHuman = false;

  if (lower.includes("preço") || lower.includes("preco") || lower.includes("orçamento") || lower.includes("orcamento")) {
    promptAugmentation =
      (promptAugmentation ? promptAugmentation + "\n" : "") +
      "O cliente mencionou preço ou orçamento — prioriza uma resposta comercial clara (valor, condições ou próximo passo), sem inventar números.";
  }

  if (
    lower.includes("problema") ||
    lower.includes("erro") ||
    lower.includes("não funciona") ||
    lower.includes("nao funciona")
  ) {
    promptAugmentation =
      (promptAugmentation ? promptAugmentation + "\n" : "") +
      "Contexto de suporte: foca em diagnosticar e resolver com passos simples; oferece humano se não houver certeza.";
  }

  let shortCircuitReply: string | null = null;
  if (input.aiState === "lead" && isVeryShortGreeting(text)) {
    shortCircuitReply = OPENING_FALLBACK;
  }

  return {
    shortCircuitReply,
    promptAugmentation,
    markNeedsHuman,
  };
}
