/**
 * Provedor LLM com timeout — OpenAI ou Anthropic (server-side, chaves em env).
 */

import type { LLMMessage } from "@devflow/ai-core";

export type AiProviderKind = "openai" | "anthropic";

export interface AiCompletionInput {
  kind: AiProviderKind;
  messages: LLMMessage[];
  maxTokens: number;
  temperature: number;
  timeoutMs?: number;
}

export interface AiCompletionResult {
  text: string;
  tokensUsed: number | null;
  durationMs: number;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 5000;

function getOpenAiKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

function getAnthropicKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY;
}

export function isProviderConfigured(kind: AiProviderKind): boolean {
  return kind === "openai" ? !!getOpenAiKey() : !!getAnthropicKey();
}

/**
 * Completa com AbortSignal; não lança — retorna error em resultado.
 */
export async function completeWithTimeout(input: AiCompletionInput): Promise<AiCompletionResult> {
  const t0 = Date.now();
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const kind = input.kind;

  if (kind === "openai" && !getOpenAiKey()) {
    return {
      text: "",
      tokensUsed: null,
      durationMs: Date.now() - t0,
      error: "OPENAI_API_KEY não configurada",
    };
  }
  if (kind === "anthropic" && !getAnthropicKey()) {
    return {
      text: "",
      tokensUsed: null,
      durationMs: Date.now() - t0,
      error: "ANTHROPIC_API_KEY não configurada",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (kind === "openai") {
      const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getOpenAiKey()}`,
        },
        body: JSON.stringify({
          model,
          messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: input.maxTokens,
          temperature: input.temperature,
        }),
      });
      clearTimeout(timer);
      if (!res.ok) {
        const err = await res.text();
        return {
          text: "",
          tokensUsed: null,
          durationMs: Date.now() - t0,
          error: `OpenAI ${res.status}: ${err.slice(0, 500)}`,
        };
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { total_tokens?: number };
      };
      const text = data.choices?.[0]?.message?.content?.trim() ?? "";
      const tokensUsed =
        typeof data.usage?.total_tokens === "number" ? data.usage.total_tokens : null;
      return { text, tokensUsed, durationMs: Date.now() - t0 };
    }

    const model = process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022";
    const system = input.messages.find((m) => m.role === "system")?.content ?? "";
    const userMessages = input.messages.filter((m) => m.role !== "system");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getAnthropicKey()!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: input.maxTokens,
        temperature: input.temperature,
        system: system || undefined,
        messages: userMessages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      const err = await res.text();
      return {
        text: "",
        tokensUsed: null,
        durationMs: Date.now() - t0,
        error: `Anthropic ${res.status}: ${err.slice(0, 500)}`,
      };
    }
    const data = (await res.json()) as {
      content?: { text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = data.content?.[0]?.text?.trim() ?? "";
    const u = data.usage;
    const tokensUsed =
      u && typeof u.input_tokens === "number" && typeof u.output_tokens === "number"
        ? u.input_tokens + u.output_tokens
        : null;
    return { text, tokensUsed, durationMs: Date.now() - t0 };
  } catch (e) {
    clearTimeout(timer);
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      text: "",
      tokensUsed: null,
      durationMs: Date.now() - t0,
      error: aborted ? `Timeout após ${timeoutMs}ms` : e instanceof Error ? e.message : String(e),
    };
  }
}

export function tenantDriverToProviderKind(aiDriver: string | null | undefined): AiProviderKind | null {
  if (aiDriver === "openAI") return "openai";
  if (aiDriver === "claude") return "anthropic";
  return null;
}
