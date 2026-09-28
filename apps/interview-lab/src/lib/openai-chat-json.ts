import {
  classifyProviderHttpStatus,
  isAbortLikeError,
  ProviderError,
} from "./provider-error";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export type OpenAiChatMessage = { role: "system" | "user"; content: string };

/**
 * Calls OpenAI Chat Completions with JSON response format; returns assistant message content (string).
 * Caller supplies the API key (e.g. user-held key from localStorage).
 *
 * Failures throw {@link ProviderError} with stable codes — never raw provider bodies (AF-AI-002).
 */
export async function postOpenAiChatJsonCompletion(opts: {
  apiKey: string;
  messages: OpenAiChatMessage[];
  model?: string;
  temperature?: number;
  /** Optional abort signal (tests / future UI cancel). Abort → provider_timeout. */
  signal?: AbortSignal;
}): Promise<string> {
  const key = opts.apiKey.trim();
  if (!key) {
    throw new Error("OpenAI API key is empty");
  }
  const body = {
    model: opts.model ?? "gpt-4o-mini",
    temperature: opts.temperature ?? 0.35,
    response_format: { type: "json_object" as const },
    messages: opts.messages,
  };

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (error) {
    if (isAbortLikeError(error)) {
      throw new ProviderError("provider_timeout");
    }
    throw new ProviderError("provider_error");
  }

  // Body may be read for protocol parsing on success; never rethrown/logged as UI text.
  const rawText = await res.text();

  if (!res.ok) {
    throw new ProviderError(classifyProviderHttpStatus(res.status), res.status);
  }

  let json: { choices?: { message?: { content?: string } }[] };
  try {
    json = JSON.parse(rawText) as { choices?: { message?: { content?: string } }[] };
  } catch {
    throw new ProviderError("provider_invalid_response", res.status);
  }

  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new ProviderError("provider_invalid_response", res.status);
  }
  return content;
}
