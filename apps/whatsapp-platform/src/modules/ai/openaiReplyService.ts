/**
 * Geração de resposta via OpenAI — camada de produção.
 * Usa openai/client com timeout, tratamento de erros e fallback.
 */

import {
  isOpenAiConfigured,
  callChatCompletion,
  resolveOpenAiConfig,
  buildSystemPrompt,
  parseStructuredOutput,
  getStructuredSystemSuffix,
  estimateCostFromTotal,
} from "./openai";

export interface GenerateReplyInput {
  message: string;
  contextMessages?: { role: "user" | "assistant"; content: string }[];
  systemPrompt?: string | null;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  useStructuredOutput?: boolean;
}

export interface GenerateReplyOutput {
  reply: string;
  intent?: string;
  confidence?: number;
  needsHuman?: boolean;
  parseUncertain?: boolean;
  tokensUsed: number | null;
  durationMs: number;
  estimatedCostUsd?: number;
  error?: string;
  fallback: boolean;
}

const MAX_CONTEXT_MESSAGES = 10;

function buildMessages(
  systemPrompt: string,
  contextMessages: { role: "user" | "assistant"; content: string }[],
  userMessage: string,
  useStructured: boolean
): { role: "system" | "user" | "assistant"; content: string }[] {
  const system = useStructured ? systemPrompt + getStructuredSystemSuffix() : systemPrompt;
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: system },
  ];

  const limited = contextMessages.slice(-MAX_CONTEXT_MESSAGES);
  for (const m of limited) {
    messages.push({ role: m.role, content: m.content });
  }
  messages.push({ role: "user", content: userMessage });

  return messages;
}

/**
 * Gera resposta via OpenAI. Nunca lança — retorna error no output em caso de falha.
 */
export async function generateReply(input: GenerateReplyInput): Promise<GenerateReplyOutput> {
  const t0 = Date.now();

  if (!isOpenAiConfigured()) {
    return {
      reply: "",
      tokensUsed: null,
      durationMs: Date.now() - t0,
      error: "OPENAI_API_KEY não configurada",
      fallback: true,
    };
  }

  const systemPrompt = buildSystemPrompt(input.systemPrompt);
  const contextMessages = input.contextMessages ?? [];
  const useStructured = input.useStructuredOutput ?? false;

  const messages = buildMessages(
    systemPrompt,
    contextMessages,
    input.message,
    useStructured
  );

  const config = resolveOpenAiConfig({
    model: input.model,
    maxTokens: input.maxTokens,
    temperature: input.temperature,
  });

  console.log("[OPENAI] request", {
    tenant: "(inline)",
    model: config.model,
    contextLen: contextMessages.length,
  });

  const result = await callChatCompletion(messages, config);

  if (result.error) {
    console.warn("[OPENAI] fallback", {
      reason: result.error.slice(0, 100),
      durationMs: result.durationMs,
      statusCode: result.statusCode,
    });
    return {
      reply: "",
      tokensUsed: result.tokensUsed,
      durationMs: result.durationMs,
      error: result.error,
      fallback: true,
    };
  }

  if (!result.text?.trim()) {
    return {
      reply: "",
      tokensUsed: result.tokensUsed,
      durationMs: result.durationMs,
      error: "Resposta vazia do modelo",
      fallback: true,
    };
  }

  let reply: string;
  let intent: string | undefined;
  let confidence: number | undefined;
  let needsHuman: boolean | undefined;
  let parseUncertain: boolean | undefined;

  if (useStructured) {
    const parsed = parseStructuredOutput(result.text);
    reply = parsed.reply;
    intent = parsed.intent;
    confidence = parsed.confidence;
    needsHuman = parsed.needs_human;
    parseUncertain = parsed.parseUncertain;
  } else {
    reply = result.text.trim();
  }

  const estimatedCost =
    result.tokensUsed != null ? estimateCostFromTotal(result.tokensUsed) : undefined;

  console.log("[OPENAI] response", {
    durationMs: result.durationMs,
    tokensUsed: result.tokensUsed,
    estimatedCostUsd: estimatedCost,
    fallback: false,
  });

  return {
    reply,
    intent,
    confidence,
    needsHuman,
    parseUncertain,
    tokensUsed: result.tokensUsed,
    durationMs: result.durationMs,
    estimatedCostUsd: estimatedCost,
    fallback: false,
  };
}

export { isOpenAiConfigured };
