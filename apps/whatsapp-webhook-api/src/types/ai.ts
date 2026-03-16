/**
 * Tipos do pipeline de IA para suporte conversacional WhatsApp.
 * AIService não chama WhatsApp; apenas retorna payload.
 */

export const SUPPORT_INTENTS = [
  "FAQ",
  "SALES",
  "MENU",
  "LOCATION",
  "HUMAN_SUPPORT",
] as const;

export type SupportIntent = (typeof SUPPORT_INTENTS)[number];

export type ConversationMessage = {
  sender: string;
  messageType: string;
  content: string;
  timestamp: Date;
};

export type GenerateResponseContext = {
  recentMessages?: ConversationMessage[];
};

export type GenerateResponsePayload = {
  intent: SupportIntent;
  response: string;
  confidence: number;
  escalate: boolean;
};

export type ClassifyIntentResult = {
  intent: SupportIntent;
  confidence?: number;
};

/** Contrato para provedor de classificação (LLM ou regras). */
export interface IntentClassifierProvider {
  classify(message: string): Promise<ClassifyIntentResult>;
}

/** Contrato para provedor de geração de resposta (LLM ou fallback). */
export interface ResponseGeneratorProvider {
  generate(
    intent: SupportIntent,
    message: string,
    context: GenerateResponseContext
  ): Promise<{ response: string; confidence: number }>;
}
