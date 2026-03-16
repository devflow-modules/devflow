import {
  buildPrompt,
  formatResponse,
  getFallbackMessage,
  safetyGuard,
  createLlmProvider,
  isLlmConfigured,
} from "@devflow/ai-core";
import type {
  SupportIntent,
  ClassifyIntentResult,
  GenerateResponseContext,
  GenerateResponsePayload,
  ConversationMessage,
} from "../types/ai.js";

const SUPPORT_INTENTS: SupportIntent[] = [
  "FAQ",
  "SALES",
  "MENU",
  "LOCATION",
  "HUMAN_SUPPORT",
];

const INTENT_KEYWORDS: Record<SupportIntent, RegExp[]> = {
  FAQ: [/\b(faq|pergunta|dúvida|como funciona|o que é|como faço)\b/i, /\?/],
  SALES: [/\b(comprar|venda|preço|valor|promoção|desconto|orçamento)\b/i],
  MENU: [/\b(menu|opções|opção|cardápio|ver opções)\b/i],
  LOCATION: [/\b(endereço|onde fica|localização|local|loja|filial)\b/i],
  HUMAN_SUPPORT: [
    /\b(atendente|humano|pessoa|falar com alguém|suporte humano)\b/i,
    /\b(reclamação|reclamar|problema|erro|não resolveu)\b/i,
  ],
};

const CLASSIFY_SYSTEM = `You are an intent classifier for WhatsApp support. Classify the user message into exactly one of: FAQ, SALES, MENU, LOCATION, HUMAN_SUPPORT. Reply with only that word, nothing else.`;

const RESPONSE_SYSTEM = `You are a helpful WhatsApp support assistant. Be brief, clear, and friendly. Respond in the same language as the user. Do not mention that you are an AI.`;

const CONFIDENCE_THRESHOLD = 0.6;

function ruleBasedClassify(message: string): ClassifyIntentResult {
  const t = message.trim();
  if (!t) return { intent: "FAQ", confidence: 0.3 };

  for (const intent of SUPPORT_INTENTS) {
    const patterns = INTENT_KEYWORDS[intent];
    for (const re of patterns) {
      if (re.test(t)) return { intent, confidence: 0.75 };
    }
  }
  return { intent: "FAQ", confidence: 0.5 };
}

function parseIntentFromLlm(raw: string): SupportIntent {
  const upper = raw.trim().toUpperCase();
  for (const intent of SUPPORT_INTENTS) {
    if (upper.includes(intent)) return intent;
  }
  return "FAQ";
}

function parseConfidenceFromResponse(raw: string): { text: string; confidence: number } {
  const match = raw.match(/\bCONFIDENCE:\s*([0-9]*\.?[0-9]+)\s*$/im);
  if (match) {
    const confidence = Math.min(1, Math.max(0, Number(match[1])));
    const text = raw.replace(/\n?\s*CONFIDENCE:\s*[0-9]*\.?[0-9]+\s*$/im, "").trim();
    return { text, confidence };
  }
  return { text: raw.trim(), confidence: 0.75 };
}

export class AIService {
  /**
   * Classifies the user message into one of: FAQ, SALES, MENU, LOCATION, HUMAN_SUPPORT.
   * Uses LLM when configured; otherwise rule-based keywords.
   */
  async classifyIntent(message: string): Promise<ClassifyIntentResult> {
    const trimmed = message?.trim() ?? "";
    if (!trimmed) return { intent: "FAQ", confidence: 0.3 };

    if (isLlmConfigured()) {
      try {
        const llm = createLlmProvider();
        const messages = buildPrompt(CLASSIFY_SYSTEM, trimmed);
        const raw = await llm.complete(messages, { maxTokens: 32, temperature: 0.2 });
        const intent = parseIntentFromLlm(raw);
        return { intent, confidence: 0.85 };
      } catch {
        return ruleBasedClassify(trimmed);
      }
    }

    return ruleBasedClassify(trimmed);
  }

  /**
   * Generates a response payload for the given intent and message.
   * Does not call WhatsApp; only returns the payload.
   * escalate = true when confidence < 0.6.
   */
  async generateResponse(
    intent: SupportIntent,
    message: string,
    context: GenerateResponseContext
  ): Promise<GenerateResponsePayload> {
    if (!safetyGuard(message)) {
      return {
        intent,
        response: getFallbackMessage(),
        confidence: 0.3,
        escalate: true,
      };
    }

    const recentMessages = context.recentMessages ?? [];
    const contextBlock =
      recentMessages.length > 0
        ? recentMessages
            .slice(-10)
            .map((m: ConversationMessage) => `[${m.sender}]: ${m.content}`)
            .join("\n")
        : "";
    const userContent = contextBlock
      ? `[Context]\n${contextBlock}\n\n[Latest message]\n${message}`
      : message;

    let response: string;
    let confidence: number;

    if (isLlmConfigured()) {
      try {
        const system = `${RESPONSE_SYSTEM}\n\nCurrent intent: ${intent}. Answer accordingly and keep it short. At the end of your reply add a single line: CONFIDENCE: <number between 0 and 1>.`;
        const llm = createLlmProvider();
        const messages = buildPrompt(system, userContent);
        const raw = await llm.complete(messages, { maxTokens: 512, temperature: 0.7 });
        const parsed = parseConfidenceFromResponse(raw);
        response = formatResponse(parsed.text);
        confidence = parsed.confidence;
      } catch {
        response = getFallbackMessage();
        confidence = 0.4;
      }
    } else {
      response = getFallbackMessage();
      confidence = 0.5;
    }

    const escalate = confidence < CONFIDENCE_THRESHOLD;

    return {
      intent,
      response,
      confidence,
      escalate,
    };
  }
}

export const aiService = new AIService();
