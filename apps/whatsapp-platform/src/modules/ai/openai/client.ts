/**
 * Cliente OpenAI — timeout, tratamento 401/429/5xx.
 * Nunca expõe a API key ao client.
 */

import { OPENAI_CONFIG } from "./config";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface ChatCompletionResult {
  text: string;
  tokensUsed: number | null;
  durationMs: number;
  error?: string;
  statusCode?: number;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503]);

function isRetryable(status: number): boolean {
  return RETRYABLE_STATUS.has(status);
}

/**
 * Chama a API OpenAI. Trata 401, 429, 5xx e timeout.
 * @throws nunca — retorna error no resultado
 */
export async function callChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResult> {
  const t0 = Date.now();
  const apiKey = OPENAI_CONFIG.apiKey;
  if (!apiKey) {
    return {
      text: "",
      tokensUsed: null,
      durationMs: Date.now() - t0,
      error: "OPENAI_API_KEY não configurada",
    };
  }

  const model = options.model ?? OPENAI_CONFIG.model;
  const maxTokens = Math.min(Math.max(options.maxTokens ?? OPENAI_CONFIG.maxTokens, 50), 500);
  const temperature = Math.min(Math.max(options.temperature ?? OPENAI_CONFIG.temperature, 0), 1);
  const timeoutMs = options.timeoutMs ?? OPENAI_CONFIG.timeoutMs;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: maxTokens,
        temperature,
      }),
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errBody = await res.text();
      const errShort = errBody.slice(0, 500);

      if (res.status === 401) {
        return {
          text: "",
          tokensUsed: null,
          durationMs: Date.now() - t0,
          error: "OpenAI 401: API key inválida ou expirada",
          statusCode: 401,
        };
      }

      if (res.status === 429) {
        return {
          text: "",
          tokensUsed: null,
          durationMs: Date.now() - t0,
          error: `OpenAI 429: Quota excedida. ${errShort}`,
          statusCode: 429,
        };
      }

      if (res.status >= 500) {
        return {
          text: "",
          tokensUsed: null,
          durationMs: Date.now() - t0,
          error: `OpenAI ${res.status}: Erro do servidor. ${errShort}`,
          statusCode: res.status,
        };
      }

      return {
        text: "",
        tokensUsed: null,
        durationMs: Date.now() - t0,
        error: `OpenAI ${res.status}: ${errShort}`,
        statusCode: res.status,
      };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };

    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    const tokensUsed =
      typeof data.usage?.total_tokens === "number" ? data.usage.total_tokens : null;

    return {
      text: text || "",
      tokensUsed,
      durationMs: Date.now() - t0,
    };
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
