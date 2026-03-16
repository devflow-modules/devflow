/**
 * Provedor LLM genérico — OpenAI ou Anthropic via variáveis de ambiente.
 * Usado pelos apps para gerar respostas com fallback para regras fixas.
 */

import type { LLMMessage, LLMCompletionOptions, LLMProvider } from "./types";

export type LlmProviderType = "openai" | "anthropic";

function getOpenAiApiKey(): string | undefined {
  return typeof process !== "undefined" ? process.env.OPENAI_API_KEY : undefined;
}

function getAnthropicApiKey(): string | undefined {
  return typeof process !== "undefined" ? process.env.ANTHROPIC_API_KEY : undefined;
}

/**
 * Cria um LLMProvider que usa OpenAI (gpt-4o-mini ou modelo em OPENAI_MODEL).
 */
function createOpenAiProvider(): LLMProvider {
  const apiKey = getOpenAiApiKey();
  const model = typeof process !== "undefined" ? process.env.OPENAI_MODEL ?? "gpt-4o-mini" : "gpt-4o-mini";

  return {
    async complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<string> {
      if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: options?.maxTokens ?? 512,
          temperature: options?.temperature ?? 0.7,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI API error: ${res.status} ${err}`);
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content?.trim();
      return content ?? "";
    },
  };
}

/**
 * Cria um LLMProvider que usa Anthropic (claude-3-haiku ou modelo em ANTHROPIC_MODEL).
 */
function createAnthropicProvider(): LLMProvider {
  const apiKey = getAnthropicApiKey();
  const model =
    typeof process !== "undefined" ? process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022" : "claude-3-5-haiku-20241022";

  return {
    async complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<string> {
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
      const system = messages.find((m) => m.role === "system")?.content ?? "";
      const userMessages = messages.filter((m) => m.role !== "system");
      const res = await fetch(
        `https://api.anthropic.com/v1/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: options?.maxTokens ?? 512,
            system: system || undefined,
            messages: userMessages.map((m) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            })),
          }),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Anthropic API error: ${res.status} ${err}`);
      }
      const data = (await res.json()) as { content?: { text?: string }[] };
      const text = data.content?.[0]?.text?.trim();
      return text ?? "";
    },
  };
}

/**
 * Retorna um LLMProvider configurado via env.
 * Preferência: OPENAI_API_KEY -> OpenAI; senão ANTHROPIC_API_KEY -> Anthropic.
 * Se nenhum estiver definido, lança.
 */
export function createLlmProvider(): LLMProvider {
  if (getOpenAiApiKey()) return createOpenAiProvider();
  if (getAnthropicApiKey()) return createAnthropicProvider();
  throw new Error("Set OPENAI_API_KEY or ANTHROPIC_API_KEY to use LLM provider");
}

/**
 * Retorna true se algum provedor estiver configurado.
 */
export function isLlmConfigured(): boolean {
  return !!(getOpenAiApiKey() || getAnthropicApiKey());
}
