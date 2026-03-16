/**
 * Orquestração de resposta IA — produto WhatsApp Platform.
 * Usa @devflow/ai-core; prompts específicos ficam aqui.
 */

import {
  classifyIntent,
  buildPrompt,
  formatResponse,
  getFallbackMessage,
  safetyGuard,
  type LLMProvider,
} from "@devflow/ai-core";

const SYSTEM_PROMPT = `Você é um assistente de suporte via WhatsApp. Seja breve, claro e cordial. Responda em português.`;

export interface GenerateReplyInput {
  userMessage: string;
  conversationContext?: string;
  llm: LLMProvider;
}

export async function generateAiReply(input: GenerateReplyInput): Promise<string> {
  const { userMessage, conversationContext = "", llm } = input;
  if (!safetyGuard(userMessage)) {
    return getFallbackMessage();
  }
  classifyIntent(userMessage);
  const userContent = conversationContext
    ? `[Contexto]\n${conversationContext}\n\n[Mensagem]\n${userMessage}`
    : userMessage;
  const messages = buildPrompt(SYSTEM_PROMPT, userContent);
  try {
    const raw = await llm.complete(messages, { maxTokens: 512, temperature: 0.7 });
    return formatResponse(raw);
  } catch {
    return getFallbackMessage();
  }
}
