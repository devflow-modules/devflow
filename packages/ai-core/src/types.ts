/**
 * Contratos genéricos para IA (LLM, intent, resposta).
 * Sem prompts específicos de produto.
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCompletionOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface LLMProvider {
  complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<string>;
}

export type IntentLabel = "greeting" | "question" | "complaint" | "farewell" | "unknown";

export interface IntentResult {
  intent: IntentLabel;
  confidence: number;
}
