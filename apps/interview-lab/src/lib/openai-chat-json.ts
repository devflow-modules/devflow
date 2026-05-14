const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export type OpenAiChatMessage = { role: "system" | "user"; content: string };

/**
 * Calls OpenAI Chat Completions with JSON response format; returns assistant message content (string).
 * Caller supplies the API key (e.g. user-held key from localStorage).
 */
export async function postOpenAiChatJsonCompletion(opts: {
  apiKey: string;
  messages: OpenAiChatMessage[];
  model?: string;
  temperature?: number;
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

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI error ${res.status}: ${rawText.slice(0, 400)}`);
  }

  try {
    const json = JSON.parse(rawText) as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content ?? "";
  } catch {
    throw new Error("OpenAI response was not valid JSON");
  }
}
