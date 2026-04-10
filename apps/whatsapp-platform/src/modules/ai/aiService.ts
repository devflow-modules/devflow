import type { LLMMessage } from "@devflow/ai-core";
import {
  completeWithTimeout,
  tenantDriverToProviderKind,
  type AiProviderKind,
} from "./aiProvider";
import { resolveOpenAiConfig } from "./openai";

export interface GenerateReplyInput {
  tenantId: string;
  /** Para logs / contexto */
  conversationId: string;
  messageText: string;
  contextMessages: { role: "user" | "assistant"; content: string }[];
  /** Prompt de sistema já montado (ex.: `buildAgentSystemPrompt` + instruções extra). */
  systemPrompt: string;
  model?: string;
  maxTokens: number;
  temperature: number;
  aiDriver: string | null | undefined;
}

export interface GenerateReplyOutput {
  text: string;
  promptUsed: string;
  tokensUsed: number | null;
  durationMs: number;
  error?: string;
}

export async function generateReply(input: GenerateReplyInput): Promise<GenerateReplyOutput> {
  const kind = tenantDriverToProviderKind(input.aiDriver);
  if (!kind) {
    return {
      text: "",
      promptUsed: "",
      tokensUsed: null,
      durationMs: 0,
      error: "Tenant sem driver LLM (openAI ou claude)",
    };
  }

  const systemContent = input.systemPrompt.trim();

  const messages: LLMMessage[] = [{ role: "system", content: systemContent }];
  for (const m of input.contextMessages) {
    messages.push({ role: m.role, content: m.content });
  }
  messages.push({ role: "user", content: input.messageText });

  const promptUsed = messages
    .map((m) => `[${m.role}]\n${m.content}`)
    .join("\n---\n")
    .slice(0, 120_000);

  const config = resolveOpenAiConfig({
    model: input.model,
    maxTokens: input.maxTokens,
    temperature: input.temperature,
  });

  const result = await completeWithTimeout({
    kind: kind as AiProviderKind,
    messages,
    model: config.model,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  });

  if (result.error || !result.text) {
    return {
      text: "",
      promptUsed,
      tokensUsed: result.tokensUsed,
      durationMs: result.durationMs,
      error: result.error ?? "Resposta vazia do modelo",
    };
  }

  return {
    text: result.text,
    promptUsed,
    tokensUsed: result.tokensUsed,
    durationMs: result.durationMs,
  };
}
